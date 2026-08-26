# PrescriptionCard

A prescription, rendered in full.

## API

```ts
type PrescriptionCardProps = {
  prescription: Prescription; // prescriber, registrationNumber, issuedAt, validUntil, items[]
  onDownload?: () => void;
  onOrderRefill?: () => void;
};
```

## Nothing is truncated

Dose, frequency, duration and instruction **are** the prescription. A UI that
abbreviates "twice daily for 5 days" to fit a card is a UI that causes a dosing
error. No "show more", no ellipsis on these fields.

Expiry is stated: a prescription is valid for a period, and a patient arriving
at a pharmacy with an expired one has wasted a trip.

## Accessibility

Each item is announced as one phrase: _"Metformin, 500 mg, 1 tablet, Twice
daily, for 30 days, With or just after food."_ An `<ol>`, because the order is
the prescriber's.

## Security

Download fetches a **server-signed** document. Never generate a prescription PDF
client-side — the signature is the entire point of the artefact.
