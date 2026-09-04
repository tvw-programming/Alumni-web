# SliderControl

A committed slider: brightness, volume, fan speed.

## API

```ts
type SliderControlProps = {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  disabled?: boolean;
  disabledReason?: string;
  onCommit: (value: number) => Promise<void>; // on release, not per frame
};
```

## Drag locally, commit on release

The handle tracks the finger from local state; the command goes on release.
Sending on every frame floods a Zigbee or Bluetooth device with sixty commands a
second, and the queue behind it is why a light appears to lag ten seconds behind
the slider.

If the device supports a continuous stream, throttle it — do not send raw frames.

## The authoritative value wins

When `value` changes underneath (another phone, a wall switch, a schedule), the
draft resets to it.

## Plus and minus are not decoration

A slider is unusable for anyone who cannot drag precisely — a tremor, a
trackpad, a keyboard, a moving train. The buttons commit immediately.

## Accessibility

MUI's `Slider` provides the `slider` role and arrow-key support;
`getAriaValueText` makes it announce _"60%"_ rather than "60".
