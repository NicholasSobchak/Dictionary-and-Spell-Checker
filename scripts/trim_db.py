#!/usr/bin/env python3
"""Create a smaller dictionary.db by keeping only the first N words (by rowid)."""
import sqlite3
import sys
import os

SRC = os.path.join(os.path.dirname(__file__), '..', 'dictionary.db')
DST = os.path.join(os.path.dirname(__file__), '..', 'dictionary-small.db')
MAX_WORDS = int(sys.argv[1]) if len(sys.argv) > 1 else 100000
BATCH = 500

print(f"Source: {SRC}")
print(f"Max words: {MAX_WORDS}")

src = sqlite3.connect(SRC)
src.row_factory = sqlite3.Row

word_ids = [r['id'] for r in src.execute(
    'SELECT id FROM words ORDER BY rowid LIMIT ?', (MAX_WORDS,))]
print(f"Keeping {len(word_ids)} words")

if os.path.exists(DST):
    os.remove(DST)

dst = sqlite3.connect(DST)
dst.row_factory = sqlite3.Row
dst.execute('PRAGMA synchronous=OFF')
dst.execute('PRAGMA foreign_keys=ON')

dst.executescript('''
CREATE TABLE words (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lemma TEXT UNIQUE,
    display_lemma TEXT,
    frequency INTEGER DEFAULT 0
);
CREATE TABLE etymologies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    word_id INTEGER NOT NULL,
    etymology TEXT NOT NULL,
    FOREIGN KEY(word_id) REFERENCES words(id) ON DELETE CASCADE
);
CREATE TABLE forms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    word_id INTEGER NOT NULL,
    form TEXT NOT NULL,
    tag TEXT,
    FOREIGN KEY(word_id) REFERENCES words(id) ON DELETE CASCADE
);
CREATE TABLE senses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    word_id INTEGER NOT NULL,
    pos TEXT,
    definition TEXT NOT NULL,
    FOREIGN KEY(word_id) REFERENCES words(id) ON DELETE CASCADE
);
CREATE TABLE examples (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sense_id INTEGER NOT NULL,
    example TEXT NOT NULL,
    FOREIGN KEY(sense_id) REFERENCES senses(id) ON DELETE CASCADE
);
CREATE TABLE synonyms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sense_id INTEGER NOT NULL,
    synonym TEXT,
    FOREIGN KEY(sense_id) REFERENCES senses(id) ON DELETE CASCADE
);
CREATE TABLE antonyms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sense_id INTEGER NOT NULL,
    antonym TEXT,
    FOREIGN KEY(sense_id) REFERENCES senses(id) ON DELETE CASCADE
);
CREATE INDEX idx_words_lemma ON words(lemma);
CREATE INDEX idx_etymologies_word_id ON etymologies(word_id);
CREATE INDEX idx_forms_word_id ON forms(word_id);
CREATE INDEX idx_forms_form ON forms(form);
CREATE INDEX idx_senses_word_id ON senses(word_id);
CREATE INDEX idx_examples_sense_id ON examples(sense_id);
CREATE INDEX idx_synonyms_sense_id ON synonyms(sense_id);
CREATE INDEX idx_antonyms_sense_id ON antonyms(sense_id);
''')

def batched(ids, n=BATCH):
    for i in range(0, len(ids), n):
        yield ids[i:i+n]

def copy_table(table, fk_col, fk_ids):
    total = 0
    for batch in batched(fk_ids):
        ph = ','.join('?' * len(batch))
        rows = src.execute(f'SELECT * FROM {table} WHERE {fk_col} IN ({ph})', batch).fetchall()
        if not rows:
            continue
        dst.execute('BEGIN')
        for row in rows:
            cols = ', '.join(row.keys())
            q = ', '.join('?' * len(row))
            dst.execute(f'INSERT INTO {table} ({cols}) VALUES ({q})', tuple(row))
        dst.execute('COMMIT')
        total += len(rows)
    return total

print("Copying words...")
for batch in batched(word_ids):
    ph = ','.join('?' * len(batch))
    dst.execute('BEGIN')
    for row in src.execute(f'SELECT id, lemma, display_lemma, frequency FROM words WHERE id IN ({ph})', batch):
        dst.execute('INSERT INTO words (id, lemma, display_lemma, frequency) VALUES (?,?,?,?)', tuple(row))
    dst.execute('COMMIT')

print(f"Copying etymologies...")
n = copy_table('etymologies', 'word_id', word_ids)
print(f"  {n} rows")

print(f"Copying forms...")
n = copy_table('forms', 'word_id', word_ids)
print(f"  {n} rows")

print(f"Copying senses...")
n = copy_table('senses', 'word_id', word_ids)
print(f"  {n} rows")

sense_ids = [r['id'] for r in dst.execute('SELECT id FROM senses')]
print(f"Copying detail tables for {len(sense_ids)} senses...")

for table in ('examples', 'synonyms', 'antonyms'):
    n = copy_table(table, 'sense_id', sense_ids)
    print(f"  {table}: {n} rows")

dst.execute('PRAGMA wal_checkpoint')
dst.close()
src.close()

new_size = os.path.getsize(DST)
old_size = os.path.getsize(SRC)
print(f"\nDone: {old_size/1e6:.0f} MB -> {new_size/1e6:.0f} MB ({new_size/old_size*100:.1f}%)")
