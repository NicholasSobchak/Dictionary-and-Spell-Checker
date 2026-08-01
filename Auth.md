# Authentication

The backend owns auth: it stores users and sessions in Postgres, hashes passwords with BCrypt, and issues a token (UUID) when you log in. The frontend saves `{token, user}` to localStorage and sends the token as `?token=` on protected calls.

## Endpoints (base `/api/auth`, all params form/query — no JSON)

- `POST /signup` — `email`, `password`, `displayName` → 201 `{id, email, displayName, message}` (409 if email taken)
- `POST /login` — `email`, `password` → 200 `{token, user, message}` (401 on wrong credentials)
- `POST /logout` — `token` → 200 `{message}`
- `GET /me` — `token` → 200 `{id, email, displayName}` (401 if invalid/expired)

`user` is always `{id, email, displayName}`.

## Errors

Backend throws `IllegalArgumentException`, a global handler returns `{error: "<message>"}`. Status is picked from the message:

- contains "registered" → 409
- contains password/session/login/token → 401
- anything else → 400

## Backend

- `User` — email (unique), password (BCrypt), displayName.
- `Session` — token, user, expiresAt (30 days by default).
- `AuthService.signup/login/logout/validateSession` — create, verify, delete, and check sessions. `refreshSession` (+7 days), `changePassword`, `deleteAccount` exist but have no endpoints yet.
- DB creds come from `DB_URL` / `DB_USERNAME` / `DB_PASSWORD` env vars. `ddl-auto=update` creates tables automatically.

## Frontend

- `models/auth.models.ts` — `AuthUser`, `AuthResponse`, `AuthError` interfaces.
- `services/api.ts` — `signup`, `login`, `logout`, `me` HTTP wrappers (form-encoded POSTs, `?token=` on GET).
- `services/auth.ts` (`AuthService`) — the session state. Signals `user`, `token`, `isAuthenticated`; persisted to localStorage under `quickquill-auth`, restored on load.
  - `login()` — calls server, stores token + user.
  - `signup()` — creates account, then auto-logins with the same credentials.
  - `logout()` — tells server, always clears local state (even if that fails).
  - `clearSession()` — hard-clears local state (used on 401 / expired session).
- Route guard (`authGuard`) on `/profile` and `/notepad` — logged out → redirect to `/login?redirect=<url>`, back after login.
- Header — logged out: "Login" / "Sign up"; logged in: display name + "Log out".

## Lifecycle

Signup or login → token stored → still logged in after refresh → token expires (30 days) → protected call 401s → session cleared → back to login. Logout deletes the session server-side and wipes local state.

## Protected resources (the notepad)

`GET/PUT /api/note?token=` resolve the user from the token, so you can only ever access your own note. Recipe for new endpoints: take a `token` param, call `validateSession(token)`, scope everything by the returned user — never trust a user id from the client.
