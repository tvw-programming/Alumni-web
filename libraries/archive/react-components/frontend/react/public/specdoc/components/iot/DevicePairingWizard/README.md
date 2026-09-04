# DevicePairingWizard

Adding a device.

## API

```ts
type DevicePairingWizardProps = {
  phase: 'scan' | 'discovering' | 'connecting' | 'room' | 'added' | 'failed';
  discovered: DiscoveredDevice[];
  rooms: { id, label }[];
  failureReason?: string;
  onStartScan / onSelectDevice / onAssignRoom / onManualSetup?
};
```

## Every phase has wording

"Put the device in pairing mode, then scan." · "Finding device…" · "Keep the
device nearby." · "Connecting… This can take up to a minute." · "Choose a room."
· "Device added." · "Couldn't find device."

A spinner with no text is why pairing flows get abandoned: the user cannot tell
whether to wait, move closer, or start again.

## "Try manual setup" is always offered on failure

Discovery fails for ordinary reasons — a 5GHz network, a device already paired
elsewhere. A dead end at that point means a returned product.

## React 19

One Action per phase. **Persist the phase server-side**: pairing takes minutes
and the user will background the app halfway through.

## Details

Weak signal says what to do about it ("move closer"), not just that it is weak.
