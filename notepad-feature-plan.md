# Notepad Feature Plan — Per-User Private Text Editor

The notepad is a private text editor: each user has exactly one note document,
only they can see or edit it. Nothing is shared between users.

## Decisions

- **Access:** `/notepad` is protected by `authGuard` — logged-out users are
  redirected to `/login?redirect=notepad` and returned after login.
- **Saving:** autosave with a ~1s debounce after typing stops, with a
  "Saving…" / "Saved" status line.

## Backend (`studio/`)

### 1. `model/Note.java` (new)
- `@Entity @Table(name = "notes", uniqueConstraints = @UniqueConstraint(columnNames = "user_id"))`
- Fields: `Long id`, `@ManyToOne(LAZY) @JoinColumn(name="user_id", nullable=false) User user`,
  `@Column(nullable=false, columnDefinition="text") String content`, `Instant updatedAt`
- `Note(User user)` ctor, `setContent(String)`, `updatedAt` stamped on every save
- `spring.jpa.hibernate.ddl-auto=update` auto-creates the `notes` table — no migration

### 2. `repository/NoteRepository.java` (new)
- `Optional<Note> findByUser(User user)`

### 3. `service/NoteService.java` (new)
- Injects `AuthService` + `NoteRepository`
- `getNote(String token)`: `authService.validateSession(token)` → find-or-create note → return
- `saveNote(String token, String content)`: resolve user → find-or-create → set content → save
- **Isolation:** the `User` always comes from the validated token — no way to
  address another user's note. Invalid/expired token → `GlobalExceptionHandler` → 401 `{error}`

### 4. `controller/NoteController.java` (new) — base `/api/note`
- `GET /api/note?token=` → 200 `{id, content, updatedAt}`
- `PUT /api/note?token=` with `content` as **form-encoded body** (`@RequestParam`)
  → 200 `{id, content, updatedAt}`
- Content travels in the request body (not the query string) so long notes
  don't hit URL length limits

## Frontend (`web/`)

### 5. `models/note.models.ts` (new)
`export interface NoteResponse { id: number; content: string; updatedAt: string; }`

### 6. `services/api.ts` — add
- `getNote(token)` → `GET /api/note` with `?token=` query
- `saveNote(token, content)` → `PUT /api/note` with `HttpParams` body (`token`, `content`)

### 7. `app.routes.ts`
- Add `canActivate: [authGuard]` to `/notepad` and `/profile`

### 8. `pages/notepad/notepad.ts/.html/.css`
- Guard ensures the page renders only when authenticated
- On init: `getNote(token)` → fill a themed `<textarea>` (dark, serif, no radius)
- `(input)` → debounced autosave (~1s) + "Saving…" / "Saved" status
- On 401 (expired session): clear session, redirect to `/login`

## Specs
- Frontend: update `notepad.spec.ts`, new `services/auth.spec.ts` (HttpTestingController)
- Backend: add `NoteService` test matching existing test layout (verify during execution)

## Verification
- Backend: `./gradlew build`; rebuild backend container
- **Isolation test (curl):** signup/login two users → PUT note as A → GET as B → assert empty
- Frontend: `npm run build` + unit tests; manual pass through `localhost:80`

## Deploy impact
- `notes` table auto-created by `ddl-auto=update` on restart — no manual migration.
  VPS Postgres must be up (existing deployment requirement).

## Out of scope
- User-scoped search history (entity exists, no endpoints exposed)
- `changePassword` / `deleteAccount` / `refreshSession` (service methods exist, no controller endpoints)
