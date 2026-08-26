# PostCard

A feed post.

## API

```ts
type PostCardProps = {
  post: Post; // author, body, media, reactions, commentCount, contentWarning?
  reactionOptions: ReactionOption[];
  onReact?: (reaction: string | undefined) => Promise<void>;
  onComment?: () => void;
  onShare?: () => Promise<void>;
  onReport?: () => void;
};
```

## Composition

Uses `ReactionBar` rather than reimplementing reactions — the optimistic
behaviour is subtle enough that two copies of it would diverge.

## `alt` is required, not optional

A type that permits missing alt text produces posts with missing alt text.
Making it required pushes the problem back to the upload flow, where someone can
actually write one.

## Content warnings

The media is blurred behind a "Show anyway" button, and the warning text says
what the reader would be choosing to see. Revealing is local state and does not
persist — a warning that disappears forever after one click stops being a
warning.

## React 19

`useOptimistic` for reactions (inside `ReactionBar`); `useActionState` for
comment submission, reporting and sharing — all of which the server can refuse.

## Accessibility

- The author line is one label: _"Meera Iyer, @meera, posted 4 hours ago
  (6 Aug 2026, 06:30), edited, Public."_
- Comment and Share are separate targets with counts in their labels.
- Post options is a real menu button.
