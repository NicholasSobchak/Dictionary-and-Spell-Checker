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

QuickQuill is a full-stack dictionary and spell-check application. The core engine is written in C++ (SQLite-backed, trie-based autocomplete), exposed to a Spring Boot backend via Java's Foreign Function & Memory API (Panama FFM). The frontend is Angular.

### Features
  - Spellchecking (Did you mean ...?)
  - Similar search
  - Word suggestion (Synonym selection)
  - Autocomplete with ghost text
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

### Architecture

```
┌──────────────┐     ┌──────────────────┐     ┌────────────────────┐
│   Angular    │────▶│   Spring Boot    │────▶│  C++ Engine (.so)  │
│   Frontend   │     │   (Java FFM)     │     │  Dictionary        │
│  :4200       │     │   :8080          │     │  SpellChecker      │
│              │     │                  │     │  SQLite + Trie     │
└──────────────┘     └──────────────────┘     └────────────────────┘
     proxy /api/*          │                         │
                           ▼                         ▼
                     ┌──────────┐            ┌──────────────┐
                     │ PostgreSQL│            │ dictionary.db│
                     │ (user data)│            │  (539 MB)    │
                     └──────────┘            └──────────────┘
```

The C++ engine is compiled into `libquickquill_engine.so` with a flat C ABI (`extern "C"`). Spring Boot calls it through Panama FFM — no JNI or C glue code needed.

### Technical Highlights
  - C++17 engine with trie-based autocomplete and thread-local SQLite connections
  - Java FFM (Foreign Function & Memory API) for native calls — no JNI
  - Spring Boot REST API
  - Angular 21 frontend with RxJS debounced search streams
  - In-memory LRU caching with thread-safe access
  - Dockerized deployment (multi-stage: C++ engine + Spring Boot + Angular)
  - CTest + Catch2 for C++ tests

#
## Setting Up / Building this Project Locally

### Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Java | 22+ | Spring Boot backend |
| CMake | 3.16+ | C++ engine build |
| vcpkg | latest | C++ dependency management |
| Node.js | 20+ | Angular frontend |
| Clang-format | 17 | Code formatting (CI) |

### Database Download
To run this with the full prebuilt database, download:

```
https://www.dropbox.com/home/dictionary-db-sql/dictionary-db?preview=dictionary.db
```

Then place `dictionary.db` in the project root.

### Tech Stack
  - **Backend:** Java 22, Spring Boot 4.1, Foreign Function & Memory API (Panama FFM)
  - **Engine:** C++17, SQLite3, nlohmann/json, CMake, vcpkg
  - **Frontend:** Angular 21, RxJS, TypeScript
  - **Tests:** Catch2 (C++), JUnit (Java)
  - **Infra:** Docker, docker-compose, nginx, GitHub Actions CI/CD

### Project Layout
```
.
├── engine/                 # C++ dictionary engine
│   ├── native/             # C ABI wrapper (extern "C" for FFM)
│   ├── include/            # Headers (Dictionary, SpellChecker, WordService)
│   ├── src/                # Implementation + CMakeLists.txt
│   └── tests/              # Catch2 unit + integration tests
├── studio/                 # Spring Boot backend
│   └── src/main/java/      # WordController, WordEngine (FFM), EngineConfig
├── web/                    # Angular frontend
│   └── src/app/            # Pages, services, models
├── vcpkg.json              # C++ dependencies (manifest mode)
├── CMakeLists.txt          # Root CMake config
├── Dockerfile              # Multi-stage build (engine + backend + frontend)
└── docker-compose.yml      # Production orchestration
```

### Configuration

The Spring Boot backend uses `studio/src/main/resources/application.properties`:

```properties
spring.application.name=studio
server.port=8080
quickquill.dictionary-path=../dictionary.db
```

Override via environment variables or CLI args:
```bash
./gradlew bootRun --args='--quickquill.dictionary-path=/path/to/dictionary.db'
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

#### 1) Clone vcpkg

```bash
git clone --depth=1 https://github.com/microsoft/vcpkg.git
./vcpkg/bootstrap-vcpkg.sh
```

#### 2) Build C++ Engine

```bash
cmake -S . -B build \
  -DCMAKE_TOOLCHAIN_FILE=vcpkg/scripts/buildsystems/vcpkg.cmake \
  -DVCPKG_TARGET_TRIPLET=x64-linux
cmake --build build --target quickquill_engine
```

This produces `build/engine/src/libquickquill_engine.so`.

#### 3) Build Spring Boot Backend

```bash
cd studio
./gradlew bootJar
```

#### 4) Build Angular Frontend

```bash
cd web
npm install
npm run build
```

### Run (Local Development)

**Terminal 1 — Spring Boot backend:**
```bash
cd studio
./gradlew bootRun
```

**Terminal 2 — Angular frontend:**
```bash
cd web
npm start
```

Open http://localhost:4200 — the Angular dev server proxies `/api/*` to `localhost:8080` automatically.

> The backend takes ~40 seconds to start on first boot while loading the 539MB dictionary into memory.

### Run Tests

**C++ tests (Catch2):**
```bash
cmake --build build --target runTests
ctest --test-dir build --output-on-failure
```

**C++ formatting check:**
```bash
find engine/src engine/include engine/tests engine/utils \
  -type f \( -name "*.cpp" -o -name "*.h" \) \
  -exec clang-format-17 --dry-run --Werror {} +
```

#
## API

| Endpoint | Description | Response |
|----------|-------------|----------|
| `GET /api/word/<word>` | Dictionary lookup | Full word JSON (200) or not-found with suggestion (404) |
| `GET /api/suggest/<word>` | Spelling suggestions | JSON array of similar words |
| `GET /api/synonym/<word>` | Synonym suggestions | JSON array of random synonyms |
| `GET /api/autofill/<word>` | Autocomplete | `{"completion": "..."}` |

Query params for autofill:
```
GET /api/autofill/hel?history=["hello","help"]&suggested=["helpful"]
```

Response shape for `/api/word/<word>`:
```json
{
  "id": 4477,
  "lemma": "hello",
  "display_lemma": "hello",
  "query": "hello",
  "forms": [
    { "form": "hellos", "tag": "plural" },
    { "form": "helloed", "tag": "past" }
  ],
  "senses": [
    {
      "pos": "intj",
      "definition": "A greeting said when meeting someone.",
      "examples": ["Hello, everyone."],
      "synonyms": [],
      "antonyms": []
    }
  ],
  "etymology": ["Hello (first attested in 1826), from holla, hollo..."],
  "alternative_searches": []
}
```

#
## Docker

Build and run everything:
```bash
docker compose up --build
```

The multi-stage Dockerfile builds:
1. Angular frontend (`node:20-slim`)
2. C++ engine shared library (`debian:bookworm-slim`)
3. Spring Boot JAR (`eclipse-temurin:22-jdk`)
4. Runtime image (`eclipse-temurin:22-jre`)

Mount `dictionary.db` into the container:
```bash
docker compose up -d
```

The `docker-compose.yml` maps `./dictionary.db` into the container at `/app/dictionary.db`.

#
## Deployment

Push to `main` triggers the deploy workflow which:
1. Builds `libquickquill_engine.so` (CMake + vcpkg)
2. Builds the Spring Boot JAR (`./gradlew bootJar`)
3. Builds the Angular frontend
4. SCPs artifacts to the VPS
5. Restarts `quickquill-backend` and `nginx` systemd services

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
