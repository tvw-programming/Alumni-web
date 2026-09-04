## Component Specification

### Name & Purpose

`ProtectedRoute` — the route guard. Decides what to _render_ on two axes:
authentication and capability.

### Location

`src/components/layout/ProtectedRoute.tsx`, `src/auth/permissions.ts`,
`src/auth/usePermission.ts`

### Public Interface

```tsx
interface ProtectedRouteProps {
  children?: ReactNode;
  requires?: readonly Permission[]; // default ['admin:access']
}
export function ProtectedRoute({ children, requires }: ProtectedRouteProps): JSX.Element;

// permissions.ts — framework-free, ported verbatim to Angular
type Permission = 'admin:access' | 'data:write' | 'diagnostics:read' | 'diagnostics:manage';
export function permissionsFor(role: UserRole): readonly Permission[];
export function roleHas(role: UserRole | null | undefined, permission: Permission): boolean;
export function roleHasAll(role, permissions: readonly Permission[]): boolean;
```

The capability table:

```ts
const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  admin: ['admin:access', 'data:write', 'diagnostics:read', 'diagnostics:manage'],
  user: ['admin:access', 'diagnostics:read'],
};
```

### Dependencies

- Internal: `store/authContext`, `auth/permissions`.
- External: `react-router-dom`.

### Data Models

Reads `AuthUser.role`. Writes nothing.

### Business Rules & Constraints

**Three outcomes, in this order:**

```tsx
if (isRestoring) return <spinner/>;                    // 1. wait — do not decide yet
if (user === null) return <Navigate to="/login" replace state={{ returnTo }} />;
if (!roleHasAll(user.role, requires)) return <Navigate to="/forbidden" replace … />;
```

- **Restoring is not "signed out".** Deciding during that window bounces a
  signed-in user to `/login` on every refresh.
- **Under-privileged goes to `/forbidden`, not `/login`.** They are already
  authenticated; asking them to sign in again is a dead end with no way out.
- **`returnTo` is preserved** in location state so login can send them back.
- **The default is `['admin:access']`, not open.** A route that forgets
  `requires` is still gated; opting out has to be deliberate (`requires={[]}`).
- **`requires` is all-of**, not any-of.
- **Call sites ask for a capability, never a role.** Adding a third role means
  editing `ROLE_PERMISSIONS` and nothing else.

**This is a UI guard, not a security boundary.** It decides what to render; a
client can always be modified. The API enforces its own rules — see
`api/specDoc/auth/auth-middleware.md`, and note which routes are actually gated.

### Extension Points

- **A new capability:** add to `Permission` and to `ROLE_PERMISSIONS`. TypeScript
  finds every switch.
- **A new role:** one entry in `ROLE_PERMISSIONS`; no component changes.
- **Gating an action rather than a route:** `usePermission('data:write')`.
