## Component Specification

### Name & Purpose

`authService` — the client for the auth API. Owns where the tokens live and the
validation of every response before it becomes a session.

### Location

`src/services/authService.ts`, `src/types/auth.ts`

### Public Interface

```ts
export async function login(credentials: LoginCredentials): Promise<AuthSession>;
export async function restoreSession(): Promise<AuthSession | null>;
export async function logout(allDevices?: boolean): Promise<void>;
export async function requestPasswordReset(email: string): Promise<ForgotPasswordResult>;
export async function resetPassword(token: string, password: string): Promise<string>;

export function getAccessToken(): string | null;
export function accessTokenIsStale(): boolean;

interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}
interface AuthUser {
  id: number;
  email: string;
  displayName: string;
  role: 'admin' | 'user';
}
interface AuthSession {
  token: string;
  expiresIn: number;
  user: AuthUser;
}
interface ForgotPasswordResult {
  message: string;
  devResetUrl?: string;
}
```

### Dependencies

- Internal: `types/api` (`AppError`), `types/auth`.
- External: `axios` — a **dedicated** instance, not the shared `apiClient`.

### Data Models

Consumes `/api/auth/*`. Same-origin (`AUTH_BASE = '/api/auth'`), which is what
lets the refresh cookie be `SameSite=Lax` rather than `None`.

### Business Rules & Constraints

**Where the tokens live, and why:**

| Token   | Location                                        | Lifetime                               |
| ------- | ----------------------------------------------- | -------------------------------------- |
| Refresh | httpOnly, SameSite=Lax cookie set by the server | session, or 30 days with "remember me" |
| Access  | **JavaScript memory only**                      | ~15 minutes                            |

```ts
let accessToken: string | null = null;
let accessTokenExpiresAt = 0;
```

The access token is deliberately not in `localStorage`: anything script can read,
injected script can steal. **Verified**: no token appears in either storage after
login, and `document.cookie` does not contain the refresh token.

**A dedicated Axios instance** with `withCredentials: true`. It must not carry
the shared client's bearer interceptor — that would be circular here.

**Every response is shape-checked before it becomes a session.** Trusting a
malformed response would mean inventing a role, and inventing a role means
inventing permissions:

```ts
if (!isSession(body))
  throw serviceError('The sign-in service returned an unexpected response.', 502);
```

**`restoreSession` returns `null` rather than throwing.** Not being signed in is
the normal state on a first visit, not an error worth logging.

**`logout` clears local state even when the request fails** (`finally`), or the
UI would claim the user is signed in when they asked not to be.

**`requestPasswordReset` always resolves**, even for an unknown address — the API
answers identically either way, and surfacing a difference here would reintroduce
the account enumeration the endpoint exists to prevent.

### Extension Points

- **A new auth operation:** a function here plus a method on the context.
- **A change-password flow:** follow `resetPassword` — it already handles the
  message-through and error mapping.
- **Silent refresh on 401:** `accessTokenIsStale()` exists for it; the axios
  client's `onAuthFailure` is the hook. Currently the guard restores on mount.
