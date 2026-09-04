# ThermostatDial

## API

```ts
type ThermostatDialProps = {
  ambient: number;      // measured
  target: number;       // requested
  mode: 'off' | 'heat' | 'cool' | 'auto';
  unit?: '°C' | '°F'; min?; max?; step?;
  activity?: string;    // "Cooling to 22°"
  onCommitTarget / onModeChange
};
```

## Ambient and target are different numbers

The whole component is built around this. Showing one number for both is the
classic thermostat UI bug — the user nudges "21" and cannot tell whether the room
_is_ 21 or the setpoint is. Here the large figure is the setpoint and "Room
24.5°C" sits under it, with the current activity below that.

## The dial is decoration

The SVG is `aria-hidden`. The focusable control is a `role="slider"` element with
`aria-valuemin/max/now` and an `aria-valuetext` that reads _"22.0 degrees
Celsius, room is 24.5"_, plus arrow-key support and +/- buttons. A circular drag
target is unusable by keyboard and hard on a touchscreen in the dark.

## Commit on release

Same rule as `SliderControl` — local while adjusting, one command when settled.
