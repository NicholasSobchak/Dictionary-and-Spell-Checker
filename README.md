<p align="center"><img src="QuickQuill-logo.png" alt="QuickQuill Logo" width=600 style="background: transparent;" /></p>

<h4 align="center">A Quick Lookup Dictionary at your service.</h4>
<p align="center">
  <a href="https://github.com/NicholasSobchak/QuickQuill-Dictionary-SpellChecker/actions/workflows/ci.yml"><img src="https://github.com/NicholasSobchak/QuickQuill-Dictionary-SpellChecker/actions/workflows/ci.yml/badge.svg" alt="Build and Test"></a>
  <a href="https://github.com/NicholasSobchak/QuickQuill-Dictionary-SpellChecker/actions/workflows/deploy.yml"><img src="https://github.com/NicholasSobchak/QuickQuill-Dictionary-SpellChecker/actions/workflows/deploy.yml/badge.svg" alt="Deploy"></a>
  <a href="https://github.com/NicholasSobchak/QuickQuill-Dictionary-SpellChecker/releases"><img src="https://img.shields.io/github/v/release/NicholasSobchak/QuickQuill-Dictionary-SpellChecker?color=purple&cachebust=1" alt="Release">
  <a href="https://quickquill.ink"><img src="https://img.shields.io/badge/website-quickquill.ink-black" alt="Website"></a>
</p>

#
### Description

QuickQuill is a C++ dictionary + spell-check backend with a lightweight web UI.
It supports fast word lookup, spell correction, and rich dictionary data (definitions, examples, synonyms, antonyms, forms, etymology).

### Features
  - Spellchecking (Did you mean ...?)
  - Similar search
  - Word suggestion (Synonym selection)
  - Lightweight frontend
  - Dictionary data including:
    - Multi-sense entries with POS and definitions
    - Synonyms and antonyms per sense (when present in source data)
    - Examples
    - Forms/inflections and etymology

> **Note:** The live deployment at [quickquill.ink](https://quickquill.ink) uses a trimmed dictionary (~200K words) to keep the free-tier VPS fast and responsive. The full database supports **over 1.28 million words** at the same speed — see the [analytics](#analytics) section below. The only words cut are obscure, obsolete word forms (rare plurals, scientific jargon, archaic inflections, etc.) — no common English vocabulary was removed.

### Analytics
```
Import complete:
  Entries     : 1,472,850
  Words       : 1,277,185
  Senses      : 1,761,078
  Forms       : 973,401
  Examples    : 745,823
  Synonyms    : 655,080
  Antonyms    : 33,768
  Etymologies : 1,349,364
```

### Technical Highlights
  - Trie-based lookup autocomplete behavior
  - HTTP RESTful API via Crow 
  - Thread management for SQL and cache access using mutex and thread local
  - In memory caching 
  - Redis caching (implementation)
  - Crow logging
  - Dockerized deployment using docker-compose
  - SQL database with rich Wiktionary extract (JSONL) 

#
## Setting Up / Building this Project Locally

### Database Download
To run this with the full prebuilt database, download:

```
https://www.dropbox.com/home/dictionary-db-sql/dictionary-db?preview=dictionary.db
```

Then place `dictionary.db` in the project root.

### This Project Uses
  - C++17
  - python3
  - [SQLite3](https://sqlite.org/cintro.html) 
  - [Crow (HTTP)](https://crowcpp.org/master/)
  - [Catch2](https://github.com/catchorg/Catch2)
  - [CMake](https://cmake.org/documentation/)
  - [nlohmann/json](https://json.nlohmann.me/)
  - [Vite](https://vite.dev/) (Node.js)
  - clang-tidy & clang-format
  - [Docker](https://docs.docker.com/manuals/)
  - [nginx](https://nginx.org/en/docs/)
  - redis-plus-plus (optional, for caching)
> Check out dependencies in vcpkg.json

### Project Layout
```
.
├── src/
│   ├── app/
│   ├── http/
│   ├── core/
│   └── data/
├── tests/
│   ├── unit/
│   └── integration/
├── utils/
│   ├── dct/
│   └── tests/
└── web/
    ├── public/assets/
    └── src/

```
### Configuration

QuickQuill uses `config.json` file, the config checks envars first and then the config.json, if both miss it will resort to default values.

Example `config.json`:
```json
{
  "database_path": "dictionary.db",
  "server_port": 80,
  "redis_host": "redis",
  "redis_port": 6379
}
```

### Code Formatting (Pre-commit Hook)
To have consistent formatting across the project, configure `pre-commit`. It's a hook that automatically runs `clang-format` on your staged C++ files before each commit.

CI uses `clang-format-17` by default.
 
**Setup Instructions:**

1.  **Install `pre-commit`:** If you don't have it already, install `pre-commit`:
    ```bash
    sudo dnf install pre-commit # Fedora
    brew install pre-commit     # macOS
    ```
2.  **Install Git Hooks:** From the project root directory, install the Git hooks:
    ```bash
    pre-commit install
    ```

### Build

This project uses **CMake** + **vcpkg** (manifest mode via `vcpkg.json`) to fetch/build dependencies.

#### 1) vcpkg

On Fedora, the system vcpkg package only ships the binary; you still need the full repo for the CMake toolchain file:

```bash
sudo dnf install vcpkg
git clone https://github.com/microsoft/vcpkg ~/vcpkg
```

On Fedora and macOS, use the same vcpkg flow:

```bash
git clone https://github.com/microsoft/vcpkg ~/vcpkg
~/vcpkg/bootstrap-vcpkg.sh
cmake -S . -B build \
  -DCMAKE_TOOLCHAIN_FILE=~/vcpkg/scripts/buildsystems/vcpkg.cmake
cmake --build build -j
```

#### 2) Configure + Build

From the project root:

```bash
cmake -S . -B build \
  -DCMAKE_TOOLCHAIN_FILE=~/vcpkg/scripts/buildsystems/vcpkg.cmake
cmake --build build -j
```

> On Fedora 44+, if `redis-plus-plus` fails to build due to GCC `-Werror=maybe-uninitialized`, remove it from `vcpkg.json` — it's unused in the build.

### Run

```bash
./build/src/dict // Console test mode
./build/src/dict_crow // Web server
```

Open:
- Frontend (Vite dev server): `cd web && npm install && npm run dev` then open http://localhost:5173
- Backend API (Crow): http://localhost:8080 (default) — keep this running so the frontend can load data

#
## API

```http
GET /api/word/<word>
GET /api/suggest/<word>
GET /api/synonym/<word>
GET /api/autofill/<word>
```
Response shape:

```json
{
  "id": 123,
  "lemma": "word",
  "forms": [{ "form": "words", "tag": "plural" }],
  "senses": [
    {
      "pos": "noun",
      "definition": "...",
      "examples": ["..."],
      "synonyms": ["..."],
      "antonyms": ["..."]
    }
  ],
  "etymology": ["..."]
}
```

#
## Academia Use & Data Attribution

_This project is developed for academic and educational purposes. QuickQuill is an independent project and has no affiliation with any organizations._ _All marks remain the property of their respective owners._

_The dictionary data used to build this system is derived from Wiktionary content processed through Wiktextract._

_If this project or its data is referenced in academic work, please cite:_
```
Tatu Ylonen. Wiktextract: Wiktionary as Machine-Readable Structured Data.
Proceedings of the 13th Conference on Language Resources and Evaluation (LREC),
pp. 1317–1325, Marseille, 20–25 June 2022.
```

_Linking to the Wiktextract project website is also appreciated:_
```
https://kaikki.org/
```
