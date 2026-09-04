# AuditLogRow

One audit entry, expandable to the field-level diff.

## API

```ts
type AuditLogRowProps = { event: AuditEvent };
// actor, action, resourceType, resourceId, at, ipAddress?, requestId?, changes?, outcome?
```

## The diff is the point

A row that says "Mehul updated invoice 1002" and nothing else is almost useless —
the question is always _what_ changed. The diff is collapsed rather than absent,
so the list stays scannable and the answer is one click away.

`null` renders as **"(empty)"**: "changed from blank to blank" is unreadable, and
a genuinely empty previous value is meaningful.

## `requestId`

Shown truncated. It is what ties the row to the server log, and it is the
difference between an audit trail that is investigable and one that is merely
reassuring.

## React 19

None. Read-only by construction — an audit trail the UI can modify is not an
audit trail.

## Accessibility

One label per row: _"Mehul Shah, updated, invoice 1002, success, 2 hours ago,
3 field changes."_ `aria-expanded` on rows that have a diff; the collapsed diff
is unmounted, so it is not a hidden tab stop.
