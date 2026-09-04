# RideStatusBottomSheet

## API

```ts
type RideStatusBottomSheetProps = {
  open: boolean;
  phase: TripPhase;
  etaLabel?: string;
  otp?: string;
  children?: ReactNode; // e.g. <DriverCard />
  onCancel?: () => Promise<void>;
  onSafety?: () => void;
};
```

Phases: `findingDriver | driverAssigned | driverArriving | driverArrived |
inProgress | completed | locationUnavailable`.

## Every phase is named — including the bad one

`locationUnavailable` says _"We have lost GPS. Your trip is still active."_ A
sheet that goes blank when the map does convinces a rider something has gone
badly wrong.

## The safety button is always present

In every phase. A control that appears only in certain states is one nobody can
find in the state where they need it.

## The OTP disappears once the trip starts

It is proof of the right car. Showing it afterwards trains people to read it out
to anyone who asks. Its label spells the digits — "4 8 2 1" — because "four
thousand eight hundred and twenty-one" is not what the driver needs to hear.

## React 19

`useActionState` for cancel, tip and support. `useOptimistic` is fine for
non-critical UI (a tip amount, saving a place) — **never** for vehicle
assignment or fare completion.
