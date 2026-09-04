# TeamMemberRow

## API

```ts
type TeamMemberRowProps = {
  member: TeamMember;
  assignableRoles?: TeamRole[];
  onChangeRole?: (role: TeamRole) => Promise<void>;
  onRemove?: () => void;
  onResendInvitation?: () => void;
};
```

## Presence is a word

"Online", "Away", "Offline" beside the dot. A coloured dot alone communicates
nothing to a screen reader and little to a colour-blind user — and presence is
exactly the kind of thing that gets built as a dot and left there.

## Composition

Uses `UserRoleChip`, which owns the role mutation and its server-authoritative
behaviour. "Resend invitation" appears only for a pending invite; a menu item
that does nothing is worse than a missing one.

## Accessibility

One row label: _"Mehul Shah, mehul@example.com, member, Away."_ The options
button is labelled per person — twenty rows must not produce twenty buttons all
called "Options".
