# DriverCard

## API

```ts
type DriverCardProps = {
  driver: Driver; // name, plateNumber, vehicleModel, vehicleColour, rating?, tripCount?
  onCall?: () => void;
  onMessage?: () => void;
};
```

## The plate is the largest thing on the card

It is the one piece of information that confirms the right car, and riders check
it from a few metres away in bad light. Colour and model next, name and photo
last — the order people actually verify in.

Its accessible label spells the plate out character by character; "KA03MN4821"
read as a word is unusable.

## Masked contact

Call and message go through a proxy. Showing a driver's real number, or a
rider's, is a safety failure that outlives the trip.
