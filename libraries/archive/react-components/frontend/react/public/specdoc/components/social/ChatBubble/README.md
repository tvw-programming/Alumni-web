# ChatBubble

## API

```ts
type ChatBubbleProps = {
  message: ChatMessage; // sender, body, sentAt, direction, status, replyTo?
  showSender?: boolean;
  onRetry?: () => Promise<void>;
};
```

## Ticks are colour-only

One tick, two ticks, two blue ticks — meaningless to a screen reader. The status
is a **word** inside the bubble's label (_"You, replying to Meera, …, 3:11 PM,
not sent"_) and the icon is `aria-hidden`.

## A failed message keeps its text

Dropping the text of a message that failed to send is the fastest way to lose
something a user typed once and will not type again. The bubble stays, outlined
in red, with "Not sent — retry".

## React 19

`useOptimistic` belongs in the _list_ (inserting the pending message), not here.
This component renders whatever status it is given. Retry reuses the original
client-generated message id, so a message that arrived before the timeout is not
delivered twice.

## Performance

`memo`. A conversation re-renders on every incoming message; the other five
hundred bubbles must not.
