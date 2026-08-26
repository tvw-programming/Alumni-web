# UserRoleChip

## API

```ts
type UserRoleChipProps = {
  role: 'owner' | 'admin' | 'member' | 'guest' | 'invited';
  assignableRoles?: TeamRole[]; // empty ⇒ read-only
  onChangeRole?: (role: TeamRole) => Promise<void>;
};
```

## React 19

`useActionState`, **never `useOptimistic`**. A predicted role shows a permission
the user does not have, and the rest of the UI then renders from a lie. The chip
shows "Updating…" and takes the new role only once the mutation succeeds — after
which the caller revalidates anything permission-dependent.

`assignableRoles` comes from the server as well.

## Accessibility

The chip is a menu button when editable (`aria-haspopup="menu"`, label _"Role:
Member. Change role"_) and plain text when not — so a viewer without permission
gets no dead control to discover.
