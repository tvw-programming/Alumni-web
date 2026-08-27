# QuantityStepper

## Benchmark references

| App | Kind | What we took |
|---|---|---|
| **Blinkit** | Design | Compact plus/minus with the value between them, sized for fast repeat taps in a dense grocery grid. Visual bounds stay small; the hit area does not. |
| **Blinkit** | Feature | Immediate visual confirmation on tap, with a strong disabled state at both ends of the range. |
| **Instacart** | Design | Quantity control legible at grid density, and a `large` variant for the product page. |
| **Instacart** | Feature | Fractional quantities for weight-sold items (0.5 kg) → `step` plus `unit`. |
| **Amazon** | Feature | Inline editing inside the cart — quantity changes without leaving the page or returning to the product → editable value, `valueChange` output. |

## Accessibility

- Never bare `+` / `−`. Labels are *"Increase quantity of Bananas"*, and at the
  minimum the decrease button becomes *"Remove Bananas"* with a bin icon.
- The value is announced when it changes.
- `role="status"` on the limit message, so *"Only 3 available"* is heard rather
  than inferred from a greyed-out button.
- Hit areas stay at least 40px even in the `compact` variant.

## Usage

```html
<app-quantity-stepper
  [config]="line.quantity"
  [itemName]="line.title"
  size="compact"
  (valueChange)="cart.setQuantity(line.id, $event)"
  (limitReached)="snackbar.open($event)"
/>
```

## Notes

- **The component owns no inventory logic.** It is handed server-confirmed
  `min`, `max` and `disabledReason`. A stepper that decides for itself whether
  stock allows one more is a stepper that disagrees with checkout.
- Fractional steps are rounded to the step's own precision, because repeatedly
  adding 0.1 in IEEE-754 drifts.
- `updateState: 'loading'` replaces the value with a spinner and disables both
  buttons — the optimistic-update-with-rollback case from the brief.
