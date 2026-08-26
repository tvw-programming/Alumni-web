# AddToCartButton

## API

```ts
type AddToCartButtonProps = {
  disabled?: boolean;
  quantity?: number;
  label?: string;
  fullWidth?: boolean;
  size?: 'small' | 'medium' | 'large';
  onAddToCart: (quantity: number) => Promise<void>;
};
```

## React 19

`useActionState`. **Not** `useOptimistic` — the server decides whether the line
was created, and a button that turns green on click is wrong every time stock
ran out between render and tap.

## State matrix

| State            | Renders                                  |
| ---------------- | ---------------------------------------- |
| idle             | "Add to cart", cart icon                 |
| pending          | spinner, "Adding…", disabled             |
| success          | check icon, "Added", polite announcement |
| error / conflict | the server's message under the button    |
| disabled         | "Unavailable"                            |

## Accessibility

The result sits in an `aria-live="polite"` region with a reserved height, so
announcing it cannot shift the layout. Politeness, not assertive: a confirmation
should not interrupt.

## Notes

Send an `Idempotency-Key` — a retried add must not create a second line.
