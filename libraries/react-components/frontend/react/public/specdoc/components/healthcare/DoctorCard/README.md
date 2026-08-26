# DoctorCard

A clinician in a search result.

## API

```ts
type DoctorCardProps = {
  doctor: Doctor; // name, qualifications, specialty, languages, fee, registrationNumber, …
  onPress: () => void;
  onBook?: () => void;
};
```

## What is on the card and why

- **Registration number, visible.** Patients are repeatedly told to verify a
  practitioner's registration; a UI that hides it behind a tap makes that advice
  impossible to follow.
- **Qualifications as registered**, not a marketing string.
- **Languages.** For a consultation this is a practical filter, not a nicety.
- **`nextAvailable` goes stale.** Render it as given; never cache it beyond the
  query that produced it.

## React 19

None — this is a presentational row. Booking is `AppointmentSlotGrid` plus the
parent's Action.

## Accessibility

"Profile" and "Book" are separate targets with complete labels — _"View profile
for Dr Ananya Rao, Internal medicine, MBBS MD, fee ₹600.00"_ — so a screen-reader
user in a list of twenty is never left with twenty buttons all called "Book".
