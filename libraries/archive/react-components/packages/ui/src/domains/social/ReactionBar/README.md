# ReactionBar

## API

```ts
type ReactionBarProps = {
  summary: { counts: Record<string, number>; mine?: string };
  options: ReactionOption[];
  disabledReason?: string;
  onReact: (key: string | undefined) => Promise<void>;
};
```

## React 19

`useOptimistic` — the textbook case. The user owns the value, the change is
trivially reversible, and waiting for a round trip makes a like button feel
broken. React restores the server's value if the request fails.

The displayed counts move with the prediction so the number under the thumb
matches the thumb, and are recomputed from the authoritative summary as soon as
it arrives.

## Accessibility

- `aria-pressed` on every reaction — that is what makes a toggle a toggle.
- Labels state the reaction, the count and ownership: _"Like, 128, your
  reaction"_.
- Glyphs are `aria-hidden`; an emoji announced by its Unicode name is noise.
- `disabledReason` explains _why_ a reaction is unavailable rather than leaving
  a dead button.
