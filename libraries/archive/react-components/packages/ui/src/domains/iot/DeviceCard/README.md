# DeviceCard

## API

```ts
type DeviceCardProps = {
  device: DeviceState; // name, room?, type, connection, power?, capabilities, statusLine?
  onPress: () => void;
  onToggle?: (next: boolean) => Promise<void>;
};
```

## The optimistic rule has a hard edge here

The switch may move immediately — the user pressed it. But **the promise must
resolve on the device's acknowledgement, not on the hub accepting the request.**
A bulb that is unplugged will accept a command and never turn on, and a UI that
treats "command sent" as "light is on" is lying about the physical world.

Pass `waitForAck` (or equivalent) to your hub API and let the promise settle on
the device report.

## Offline

The control is **disabled with the reason stated** — _"Bedroom light is not
responding; control unavailable"_ — rather than a switch that moves and changes
nothing.

## Accessibility

One label per card: _"Bedroom light, Bedroom, on, Online, 60% brightness · warm
white."_ The switch's own label names the action: "Turn Bedroom light off".
"No response" is the wording for offline, matching what home platforms show.
