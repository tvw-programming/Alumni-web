# NotificationListItem

## API

```ts
type NotificationListItemProps = {
  notification: AppNotification; // title, body?, category, at, read, actorName?, severity?
  onPress: () => void;
  onToggleRead?: (read: boolean) => Promise<void>;
};
```

## React 19

`useOptimistic` for read state — the user's own flag, reversible, and a list that
waits for a round trip before dimming a row feels broken. React restores the
server's value if the request fails.

Opening marks as read in the same gesture, which is what users expect and what
"mark all as read" then has to stay consistent with.

## Accessibility

Unread is **in the label** (_"…, unread"_), not only bold text and a tinted
background — the two usual signals, neither of which reaches a screen reader.
Severity is a word too. Every visual fragment is `aria-hidden` so the row is
announced once as a sentence.
