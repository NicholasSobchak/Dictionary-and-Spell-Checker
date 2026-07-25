import { Injectable } from '@angular/core';

const HISTORY_KEY = 'quickquill-history';
const SUGGESTED_KEY = 'quickquill-suggested-words';
const HISTORY_LIMIT = 1000;
const SUGGESTED_LIMIT = 1000;

const DISPLAY_WORD_RE = /[^A-Za-z0-9''\s-]+/g;
const MULTISPACE_RE = /\s+/g;
const SEARCH_INPUT_RE = /[^A-Za-z'\s.-]+/g;

@Injectable({ providedIn: 'root' })
export class Storage {
  // History

  getHistory(): string[] {
    const stored = localStorage.getItem(HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  saveHistory(words: string[]): void {
    localStorage.setItem(
      HISTORY_KEY,
      JSON.stringify(words.slice(0, HISTORY_LIMIT))
    );
  }

  addToHistory(word: string): void {
    if (!word) return;
    const items = this.getHistory();
    const filtered = items.filter(
      (w) => w.toLowerCase() !== word.toLowerCase()
    );
    filtered.unshift(word);
    this.saveHistory(filtered.slice(0, HISTORY_LIMIT));
  }

  clearHistory(): void {
    localStorage.removeItem(HISTORY_KEY);
  }

  // Suggested Words

  getSuggestedWords(): string[] {
    const stored = localStorage.getItem(SUGGESTED_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  saveSuggestedWords(words: string[]): void {
    localStorage.setItem(
      SUGGESTED_KEY,
      JSON.stringify(words.slice(0, SUGGESTED_LIMIT))
    );
  }

  addSuggestedWords(words: string[]): void {
    if (!Array.isArray(words) || !words.length) return;

    const merged = [
      ...words.map((w) => this.displayWord(w)).filter(Boolean),
      ...this.getSuggestedWords(),
    ];
    const unique: string[] = [];
    const seen = new Set<string>();

    merged.forEach((item) => {
      const normalized = item.toLowerCase();
      if (seen.has(normalized)) return;
      seen.add(normalized);
      unique.push(item);
    });

    this.saveSuggestedWords(unique.slice(0, SUGGESTED_LIMIT));
  }

  clearSuggestedWords(): void {
    localStorage.removeItem(SUGGESTED_KEY);
  }

  // Utilities

  displayWord(text: string): string {
    if (!text) return '';
    return text
      .replace(DISPLAY_WORD_RE, ' ')
      .replace(MULTISPACE_RE, ' ')
      .trim();
  }

  sanitizeSearchInput(text: string): string {
    if (!text) return '';
    return text.replace(SEARCH_INPUT_RE, '');
  }

  encodePathSegment(value: string): string {
    return encodeURIComponent(value).replace(/%20/g, '+');
  }
}
