# CommentInputBar

## API

```ts
type CommentInputBarProps = {
  value: string;
  replyingTo?: string;
  mentionCandidates: MentionCandidate[];
  maxLength?: number;
  onChange / onQueryChange / onSubmit
};
```

## React 19

`useActionState` for submission. The comment text is cleared by the parent only
after the Action resolves, and a failure says "Your comment has been kept."

## Details

- Composes `MentionTextInput` rather than owning a second mention
  implementation.
- The character counter appears only within 100 of the limit. A counter from the
  first keystroke is pressure nobody asked for.
- The result is announced in a polite live region.
