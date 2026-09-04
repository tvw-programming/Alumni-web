# EmergencyContactCard

Emergency contacts and the local emergency number.

## API

```ts
type EmergencyCardProps = {
  emergencyNumber: string; // from the user's region
  emergencyLabel: string;
  contacts: EmergencyContact[];
  medicalNotes?: string[];
  onCall: (phone: string) => void;
};
```

## Two decisions specific to an emergency screen

- **The emergency number is a prop.** Hard-coding 911 ships a US-only app; 112,
  999, 108 and 000 are all correct somewhere, and a wrong number here is the
  worst bug this library could ship.
- **Nothing is behind a confirmation.** A user reaching this screen cannot
  answer "Are you sure?" — and an accidental emergency call is a far smaller
  harm than a delayed one.

## Details

- The primary contact sorts first regardless of array order.
- `medicalNotes` (blood group, allergies) are for a responder holding the phone,
  so they are on the card rather than behind a tap.
- Large touch target, high contrast, error colour — this screen is used under
  stress and often one-handed.
