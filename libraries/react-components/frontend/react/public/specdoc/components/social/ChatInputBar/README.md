# ChatInputBar

The composer.

## API

```ts
type ChatInputBarProps = {
  value: string;
  replyTo?: ChatMessage;
  attachments: AttachmentDraft[];
  disabled?: boolean;
  disabledReason?: string;
  onChange / onSend / onAttach / onRemoveAttachment? / onCancelReply?
};
```

## The draft belongs to the parent

It has to outlive this component: navigating away and back, or a re-render from
an incoming message, must not eat what someone typed. Persist it per
conversation.

**The text is cleared only after the Action resolves.** Clearing on click loses
the message when the send fails — exactly when the user most wants it back. On
failure the bar says so and adds "Your message has been kept."

## React 19

`useActionState` for send. `useOptimistic` belongs in the message list, where
the pending bubble is inserted.

## Keyboard

Enter sends, Shift+Enter is a newline. Not negotiable in a chat input.

## States

Send is disabled while attachments are uploading, with the reason stated —
sending a message whose attachment is 62% uploaded produces a message with a
broken file.
