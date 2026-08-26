## Component Specification

### Name & Purpose

`AuthProvider` / `useAuth` — shared session state for the component tree, and the
one place the session is restored on load.

### Location

`src/store/authContext.tsx`

### Public Interface

```tsx
export function AuthProvider({ children }: { children: ReactNode }): JSX.Element;
export function useAuth(): AuthContextValue;

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isRestoring: boolean; // see below
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
}
```

### Dependencies

- Internal: `services/authService`, `api/queryClient`.
- External: React.

### Data Models

Holds `AuthUser | null`. The access token is **not** here — it lives in the
service's module scope.

### Business Rules & Constraints

**`isRestoring` is a real state, not a detail.** The access token is in memory,
so a reload starts signed out and the session returns asynchronously:

```tsx
useEffect(() => {
  let cancelled = false;
  void authService.restoreSession().then((session) => {
    if (cancelled) return;
    setUser(session?.user ?? null);
    setIsRestoring(false);
  });
  return () => {
    cancelled = true;
  };
}, []);
```

Without a guard on this, `ProtectedRoute` redirects to `/login` on **every**
reload — and because the redirect is `replace`, the page the user was on is lost.
That was a real bug; see [`protected-route.md`](protected-route.md).

**`cancelled` guards the async set** so a provider unmounted mid-restore does not
set state.

**`logout` clears the query cache** (`queryClient.clear()`), so the next user
never sees the previous one's data.

**`useAuth` throws outside a provider.** A silent `null` would surface as
"everything is signed out" somewhere far from the cause.

### Extension Points

- **New session-derived state** (e.g. `permissions`): compute in the `useMemo`;
  keep it derived, not stored twice.
- **Sign out everywhere:** `authService.logout(true)` — the API supports `?all=true`.
- **Testing a signed-in tree:** mock `@/services/authService` and have
  `restoreSession` resolve a session. There is no storage to seed.
