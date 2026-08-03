# Authentication

The backend owns auth: it stores users and sessions in Postgres, hashes passwords with BCrypt, and issues a token (UUID) when you log in. The frontend saves `{token, user}` to localStorage and sends the token as `?token=` on protected calls.

## Endpoints (base `/api/auth`, all params form/query — no JSON)

- `POST /signup` — `email`, `password`, `displayName` → 201 `{token, user, message}` (409 if email taken). Opens a session immediately, so the client doesn't need a second login call.
- `POST /login` — `email`, `password` → 200 `{token, user, message}` (401 on wrong credentials)
- `POST /logout` — `token` → 200 `{message}`
- `POST /refresh` — `token` → 200 `{token, user, message}`, extends the session's expiry (+7 days). Called by the client on app start to keep sessions alive.
- `POST /change-password` — `token`, `oldPassword`, `newPassword` → 200 `{message}` (401 if the token is invalid or the old password is wrong)
- `POST /delete-account` — `token` → 200 `{message}`, deletes the account and all its sessions (401 if the token is invalid)
- `GET /me` — `token` → 200 `{id, email, displayName}` (401 if invalid/expired)

`user` is always `{id, email, displayName}`.

## Search history (base `/api/search-history`, all params form/query — no JSON)

- `GET /search-history?token=` → 200 `["word1", "word2", ...]`, most recent first (401 if invalid token)
- `POST /search-history?token=&word=` → 200 `{message}`, records a word (moves it to the front)
- `DELETE /search-history?token=` → 200 `{message}`, clears the user's history

History is account-scoped: there is no localStorage cache on the frontend anymore, so the backend is the only place history lives.

History is capped at 500 words per user.

## Suggested words (base `/api/suggested-words`, all params form/query — no JSON)

- `GET /suggested-words?token=` → 200 `["word1", "word2", ...]`, most recent first (401 if invalid token)
- `POST /suggested-words/sync?token=&word=a&word=b` → 200 `{message}`, records many words at once (stored synonyms)
- `DELETE /suggested-words?token=` → 200 `{message}`, clears the user's suggested words

Suggested words are account-scoped: no localStorage cache on the frontend anymore.

Capped at 1000 words per user. `deleteAccount` removes history, suggested words, the
note, and sessions.

## Errors

Backend throws `IllegalArgumentException`, a global handler returns `{error: "<message>"}`. Status is picked from the message:

- contains "registered" → 409
- contains password/session/login/token → 401
- anything else → 400

## Backend

- `User` — email (unique), password (BCrypt), displayName.
- `Session` — token, user, expiresAt (30 days by default).
- `AuthService.signup/login/logout/validateSession/refreshSession/changePassword/deleteAccount` — create, verify, delete, check, and extend sessions. `changePassword` and `deleteAccount` resolve the user from the session token — never a client-supplied user id.
- `NoteService` — per-user note storage (`GET/PUT /api/note?token=`), scoped entirely by the validated token.
- DB creds come from `DB_URL` / `DB_USERNAME` / `DB_PASSWORD` env vars. `ddl-auto=update` creates tables automatically.

## Frontend

- `models/auth.models.ts` — `AuthUser`, `AuthResponse`, `AuthError` interfaces.
- `services/api.ts` — `signup`, `login`, `logout`, `refresh`, `changePassword`, `deleteAccount`, `me`, `updateProfile`, `getNote`, `saveNote` HTTP wrappers (form-encoded POSTs, `?token=` on GET).
- `services/auth.ts` (`AuthService`) — the session state. Signals `user`, `token`, `isAuthenticated`; persisted to localStorage under `quickquill-auth`, restored on load.
  - `login()` — calls server, stores token + user.
  - `signup()` — creates account; the backend returns a token so no second login call.
  - `refreshSession()` — extends the session on app start; clears local state only if the server rejects the token (401).
  - `changePassword()` / `deleteAccount()` — used by the Profile page.
  - `logout()` — tells server, always clears local state (even if that fails).
  - `clearSession()` — hard-clears local state (used on 401 / expired session).
- Route guard (`authGuard`) on `/profile` and `/notepad` — logged out → redirect to `/login?redirect=<url>`, back after login.
- Header — logged out: "Login" / "Sign up"; logged in: display name + "Log out".

## Lifecycle

Signup or login → token stored → still logged in after refresh (session extended on each app start) → token expires → protected call 401s → session cleared → back to login. Logout deletes the session server-side and wipes local state.

## Protected resources (the notepad)

`GET/PUT /api/note?token=` resolve the user from the token, so you can only ever access your own note. Recipe for new endpoints: take a `token` param, call `validateSession(token)`, scope everything by the returned user — never trust a user id from the client.
