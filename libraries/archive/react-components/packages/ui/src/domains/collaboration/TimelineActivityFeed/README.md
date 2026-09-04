# TimelineActivityFeed

Grouped activity, with per-entry and bulk read state.

## API

```ts
type TimelineActivityFeedProps = {
  groups: { heading: string; entries: ActivityEntry[] }[];
  unreadCount: number;
  onOpen: (id: string) => void;
  onToggleRead: (id: string, read: boolean) => Promise<void>;
  onMarkAllRead?: () => Promise<void>;
};
```

## React 19

`useOptimistic` for read flags — the user's own state, reversible, and a feed
that waits for a round trip before dimming a row feels broken.

"Mark all as read" is optimistic too, but **the resulting count comes from the
refetch**: a predicted "0 unread" that turns out to be 3 is worse than a
half-second wait.

## Accessibility

- Date headings are real `Divider` separators inside labelled lists
  (_"Today, 2 items"_), so the boundary between Today and Yesterday is
  announced.
- Unread is in the row label, not only bold text and a tint.
- "All caught up" replaces the count at zero, rather than showing "0 unread".
