# OrderStatusTimeline

## API

```ts
type OrderStatusTimelineProps = {
  steps: OrderStep[]; // { id, label, state, at?, detail? }
  orientation?: 'vertical' | 'horizontal';
};
```

`state` is `complete | current | upcoming | failed | skipped`.

## React 19

None. Order progress is server-authoritative — never predicted, never advanced
locally. Poll or subscribe; a delivery step is not something the client decides.

## Accessibility

- A real `<ol>`/`<li>`: the sequence _is_ the meaning, and "list, 5 items" plus
  "step 4 of 5" conveys progress that a connector line does not.
- The current step carries `aria-current="step"`.
- Each step's condition is a word in its label — _"Out for delivery, in
  progress, 2 hours ago (3 Aug 2026, 04:15)"_ — because a green tick and a grey
  circle are the same circle to a screen reader.
- Connector lines are `aria-hidden`.
