# BookingSummaryCard

The review-and-confirm step.

## API

```ts
type BookingSummaryCardProps = {
  title: string;
  lines: BookingSummaryLine[];
  total: Money;
  cancellationPolicy?: string;
  onConfirm: () => Promise<BookingOutcome>;
};

type BookingOutcome = 'confirmed' | 'pendingPayment' | 'priceChanged' | 'unavailable';
```

## Four outcomes, because a booking has four

"Unavailable" and "price changed" are **not errors** — they are the inventory
moving under a user who took ninety seconds to read the page. Each gets its own
wording and its own next step:

| Outcome        | Says                                       |
| -------------- | ------------------------------------------ |
| confirmed      | "Your ticket is on its way by email."      |
| pendingPayment | "Do not book again — we will update this." |
| priceChanged   | "Review the new total and try again."      |
| unavailable    | "Nothing has been charged."                |

Every non-confirmed outcome answers the money question explicitly. It is the
first thing the user wants to know.

## React 19

`useActionState`; the outcome comes from the server. Send an `Idempotency-Key` —
a retried confirm must not create a second booking.
