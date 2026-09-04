## Component Specification

### Name & Purpose
`AuthService` + `AuthStore` — the auth API client and the session state it
writes. The store holds *who*; the service performs *what*.

### Location
`src/app/core/auth/` — `auth.service.ts`, `auth-store.ts`, `auth-storage.ts`,
`auth.types.ts`, `permissions.ts`

### Public Interface

```ts
@Injectable({ providedIn: 'root' })
export class AuthService {
  login(credentials: LoginCredentials): Promise<AuthSession>;
  restore(): Promise<AuthSession | null>;      // spends the refresh cookie
  logout(allDevices?: boolean): Promise<void>;
  requestPasswordReset(email: string): Promise<ForgotPasswordResult>;
  resetPassword(token: string, password: string): Promise<string>;
}

@Injectable({ providedIn: 'root' })
export class AuthStore {
  readonly user: Signal<AuthUser | null>;
  readonly isAuthenticated: Signal<boolean>;
  readonly isRestoring: Signal<boolean>;
  readonly displayName: Signal<string | null>;
  readonly role: Signal<UserRole | null>;
  has(permission: Permission): boolean;
  hasAll(permissions: readonly Permission[]): boolean;
  setSession(session: AuthSession): void;
  signOut(): void;
  restoreSettled(): void;
}

// auth-storage.ts — module scope, not a service
export function getStoredAuthToken(): string | null;
export function setAccessToken(token: string, expiresInSeconds: number): void;
export function clearAccessToken(): void;
export function accessTokenIsStale(): boolean;
```

### Dependencies
- Internal: `QueryCache` (cleared on sign-out), `core/http/api-error`.
- External: `@angular/common/http`, `rxjs` (`firstValueFrom` only).

### Data Models

```ts
interface AuthUser    { id: number; email: string; displayName: string; role: 'admin' | 'user' }
interface AuthSession { token: string; expiresIn: number; user: AuthUser }
interface LoginCredentials { email: string; password: string; rememberMe?: boolean }
```

### Business Rules & Constraints

**Token placement is identical to React's**: access token in **module-scope
memory**, refresh token in an httpOnly `SameSite=Lax` cookie. Every call sets
`withCredentials: true`.

**`auth-storage.ts` is module scope, not a service**, because the HTTP
interceptor reads it on every request and must not depend on the injector being
available.

**`isRestoring` is a distinct state.** The access token is in memory, so a reload
starts signed out. Guards must wait — see [`guards.md`](guards.md).

**Responses are shape-checked before they become a session.** Trusting a
malformed response means inventing a role, and inventing a role means inventing
permissions.

**`restore()` returns `null` rather than throwing.** Not being signed in is the
normal first-visit state.

**`logout` clears local state in `finally`,** even when the request fails, and
calls `QueryCache.invalidateAll()` so the next user never sees the previous one's
data.

**`permissions.ts` is a verbatim port of the React file** — same capability
table, same `roleHas`/`roleHasAll`. Call sites ask for a capability, never a role.

### Extension Points

- **A new auth operation:** a method here; the store only changes if it holds new
  state.
- **A new capability:** `Permission` + `ROLE_PERMISSIONS` in `permissions.ts` —
  shared shape with React, so change both.
- **Testing a signed-in tree:** provide a stub `AuthService` whose `restore()`
  calls `store.setSession(...)`. There is no storage to seed.
