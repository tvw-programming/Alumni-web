## Component Specification

### Name & Purpose
`authGuard` / `permissionGuard` — route guards, the Angular counterpart of
React's `ProtectedRoute`. Also the place the session is restored when the first
route is guarded.

### Location
`src/app/core/auth/auth.guard.ts`

### Public Interface

```ts
export const authGuard: CanActivateFn;                              // async
export function permissionGuard(required: readonly Permission[]): CanActivateFn;
```

Usage:

```ts
{ path: 'admin', canActivate: [authGuard], children: [
    { path: 'master-data', children: [
        { path: 'error-log',
          canActivate: [permissionGuard(['diagnostics:read'])], … },
    ]},
]}
```

### Dependencies
- Internal: `AuthStore`, `AuthService`, `permissions`.
- External: `@angular/router`.

### Data Models
Reads `AuthUser.role`. Writes nothing.

### Business Rules & Constraints

**Both guards are `async` and await the restore first:**

```ts
async function sessionReady(): Promise<void> {
  const store = inject(AuthStore);
  if (!store.isRestoring()) return;
  await inject(AuthService).restore();
  store.restoreSettled();
}
```

Deciding before that settles bounces a signed-in user to `/login` on every
reload. `provideAppInitializer` in `app.config.ts` does the same restore at
startup, because a **public** route never runs a guard — and the public header
still renders "Sign in" versus the user's name.

- **No session → `/login?returnTo=<url>`.**
- **Session without the capability → `/admin/forbidden`, not `/login`.** They are
  already authenticated; asking them to sign in again is a dead end.
- **`/admin/forbidden` is deliberately ungated**, or a denial would loop.
- **`permissionGuard` is all-of.**

**These are UI guards, not a security boundary.** The API enforces its own rules
— and note exactly which routes it gates, in
`api/specDoc/auth/auth-middleware.md`.

### Extension Points

- **Gating a route:** add `authGuard`, and `permissionGuard([...])` if a
  capability is required.
- **A new capability:** `permissions.ts` only.
- **A `CanDeactivate` guard** for unsaved forms: not implemented; `GenericPopup`
  has the dialog-level equivalent.
