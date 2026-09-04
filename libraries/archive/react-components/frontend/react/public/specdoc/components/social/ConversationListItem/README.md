# ConversationListItem

## API

```ts
type ConversationListItemProps = {
  conversation: Conversation; // title, lastMessage, lastMessageAt, unreadCount, draft?, presence?, muted?
  selected?: boolean;
  onPress: () => void;
};
```

## Unread is a count, not a font weight

Bold text and a tinted row are the two signals most commonly used for unread,
and neither reaches a screen reader. The label says _"3 unread"_ or _"no unread
messages"_. Presence is a word too — a green dot alone says nothing.

## Details

- A saved draft replaces the last message and is prefixed "Draft:", so a
  half-written reply is not silently lost behind the other person's message.
- `memo`, because a conversation list re-renders on every incoming message.
