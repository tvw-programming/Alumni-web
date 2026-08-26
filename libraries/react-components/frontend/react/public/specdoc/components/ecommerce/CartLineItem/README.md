# CartLineItem

## API

```ts
type CartLineItemProps = {
  item: CartItem;
  quantity: number;
  updateState?: 'idle' | 'updating' | 'error';
  errorMessage?: string;
  onQuantityChange: (quantity: number) => Promise<void>;
  onRemove: () => Promise<void>;
};
```

## React 19

`useOptimistic` for quantity and removal. The user chose the number, the change
is reversible, and a stepper that waits for a round trip feels broken.

React shows the predicted quantity during the transition and falls back to the
authoritative `quantity` prop when the Action settles — so **a server that
clamps to available stock wins with no rollback code here**.

## The line drawn through this component

The **line total is derived from the optimistic quantity**, so the row stays
internally consistent while pending. The **cart total is not** — that is
`CartSummary`, and it shows only server-computed money. Predicting a total is
how a checkout screen ends up charging a different number than it displayed.

## State matrix

| State           | Renders                                                       |
| --------------- | ------------------------------------------------------------- |
| idle            | quantity, line total                                          |
| updating        | 70% opacity, spinner in place of the total, steppers disabled |
| at max quantity | increase disabled                                             |
| quantity 1      | decrease becomes a delete, relabelled                         |
| error           | `role="alert"` message under the row                          |

## Accessibility

- One row label: _"Aurora Running Shoe, Black · UK 8, quantity 2, ₹17,990.00."_
- The quantity is an `aria-live="polite"` region, so the new value is announced.
- The decrease button relabels itself to "Remove …" at quantity 1 rather than
  silently deleting.

## Performance

`memo` by line. Keep cart state normalised by line-item id — one quantity change
must not re-render every row.
