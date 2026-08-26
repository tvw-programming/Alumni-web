# PinPad

PIN entry.

## API

```ts
type PinPadProps = {
  length: number;
  value: string;
  prompt?: string;
  errorMessage?: string;
  attemptsRemaining?: number;
  disabled?: boolean;
  shuffle?: boolean;
  onChange: (next: string) => void;
  onComplete: (pin: string) => void;
};
```

## Three rules, all security rather than style

1. **The PIN never lives here.** The parent holds it and clears it; a component
   keeping it in its own state keeps it after unmount, in a fiber a profiler can
   read.
2. **The dots are labelled, not counted.** `role="status"` announces _"4 of 6
   digits entered"_ — announcing the digits themselves would read the PIN aloud
   in a room.
3. **`shuffle` randomises the layout.** Positional shoulder-surfing is the
   realistic attack on a keypad in public. The shuffle happens per mount, never
   per keystroke: moving keys under a finger mid-entry produces wrong PINs and
   lockouts.

## Notes

- `Math.random` is deliberate for the shuffle — it defeats a watching human, not
  a cryptographic adversary, and the layout is on screen anyway.
- Never put a PIN in a query key, a log line, or an error message.
- Show `attemptsRemaining` before the last one, not after the lockout.
