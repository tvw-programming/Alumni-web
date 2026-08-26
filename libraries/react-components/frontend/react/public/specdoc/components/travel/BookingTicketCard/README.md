# BookingTicketCard

The boarding pass.

## API

```ts
type BookingTicketCardProps = {
  ticket: BookingTicket; // reference, passengerName, status, from/to, departAt, gate?, seat?, barcodeValue
  onShowPass?: () => void;
  onAddToWallet?: () => void;
};
```

## The barcode value is printed as text

Scanners fail, screens crack, and staff type the reference in. A pass that exists
only as a barcode image strands someone at a gate.

The reference is monospace and large, and its accessible label spells it out
character by character — "QK7T2M" read as a word is useless over a phone.

## "Subject to change" on the gate

Because it is. A passenger who read "Gate 14" an hour ago and never re-checked is
the most common way people miss flights.

## Note

`onShowPass` should go full-screen at maximum brightness — a gate scanner needs
both.
