# TravellerDetailsForm

## API

```ts
type TravellerDetailsFormProps = {
  travellers: Traveller[];
  requiresPassport?: boolean; // international itinerary
  travelDate?: string; // so expiry can be checked against it
  onSubmit: (travellers: Traveller[]) => Promise<void>;
};
```

## The rule that saves people at the airport

**Names must match the travel document**, and the form says so at the field:
_"Enter names exactly as they appear on the passport or ID used to travel."_ A
mismatched name is a denied boarding, usually on a non-refundable ticket.

## Passport validity

Checked against **travel date + 6 months**, which is the rule most destinations
apply and the one airlines enforce at check-in. Validating only "not expired"
passes a passport that will be refused.

## React 19

`useActionState` with per-traveller `fieldErrors`, keyed `${travellerId}.field`,
so messages land under the right input in a form with several people in it.
