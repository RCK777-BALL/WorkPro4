# Suggested Follow-up Tasks

## 1. Fix typography class typo in suspense fallback
- **Category:** Typo
- **Location:** `src/App.tsx` (`text-mutedfg` class name)
- **Issue:** The suspense fallback div uses the non-existent `text-mutedfg` utility class. Tailwind tokens expose the `text-muted-fg` variant, so the typo prevents the intended theming color from applying in loading states.
- **Proposed Task:** Rename the class to `text-muted-fg` (and audit nearby components such as the shell layout for the same typo) so loading placeholders inherit the correct semantic color. 【F:src/App.tsx†L27-L35】【F:src/components/layout/AppShell.tsx†L80-L189】【F:src/styles/tokens.css†L1-L24】

## 2. Include `siteId` in authenticated user context
- **Category:** Bug
- **Location:** `backend/src/middleware/auth.ts`
- **Issue:** The `authenticateToken` middleware selects only the user's ID, email, name, role, and tenant ID from Prisma. It later reads `siteId` from the same record, but that field is never fetched, so tenant-scoped routes that rely on `req.user.siteId` (for example asset filters) always see `null` and cannot enforce site-level scoping.
- **Proposed Task:** Update the Prisma `select` clause to include `siteId`, ensuring the middleware attaches the correct site context to `req.user`.
【F:backend/src/middleware/auth.ts†L91-L114】【F:backend/src/routes/assets.ts†L61-L121】

## 3. Correct frontend environment variable instructions
- **Category:** Documentation discrepancy
- **Location:** Root `README.md`
- **Issue:** The quick-start guide instructs contributors to write `VITE_API_URL` into `frontend/.env`, but the active Vite app lives at the repository root and reads `.env` alongside `vite.config.ts`. Placing the variable in `frontend/.env` has no effect, which can leave developers pointing at the wrong API base URL.
- **Proposed Task:** Update the README to direct users to create or edit the root `.env` file (or mention both locations if the legacy workspace still needs it) so the configuration matches the actual build tooling.
【F:README.md†L94-L107】【F:vite.config.ts†L1-L24】【F:src/lib/api.ts†L42-L68】

## 4. Strengthen `useAuth` store tests
- **Category:** Test improvement
- **Location:** `src/hooks/useAuth.test.ts`
- **Issue:** The current test suite only covers the happy-path login flow. It does not assert that failed logins clear persisted tokens, surface backend errors, or that `logout` triggers the API call. Those behaviors are critical to auth reliability.
- **Proposed Task:** Add tests that (a) simulate a login failure and assert `api.clearToken` is invoked and the error state is set, and (b) verify `logout` clears state and calls the logout endpoint, improving coverage of edge cases.
【F:src/hooks/useAuth.test.ts†L1-L98】【F:src/hooks/useAuth.ts†L34-L92】
