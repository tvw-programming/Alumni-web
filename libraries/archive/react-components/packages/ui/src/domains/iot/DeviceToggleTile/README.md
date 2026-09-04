# DeviceToggleTile

A large press-anywhere tile, for a wall panel or a phone home screen.

## API

```ts
type DeviceToggleTileProps = {
  id: DeviceId;
  name: string;
  room?: string;
  on: boolean;
  reachable?: boolean;
  detail?: string;
  onToggle: (next: boolean) => Promise<void>;
};
```

## The whole tile is the button

On a panel mounted by a door, a 20px switch is unusable. The target is the card.

## State is legible without colour

The tile says **"On" / "Off" / "No response"** in text, so it works in a hallway,
at a glance, and to a screen reader. `aria-pressed` makes it a toggle.

## React 19

`useOptimistic`, with the same hard edge as `DeviceCard`: the promise must
resolve on the **device's acknowledgement**, not on the hub accepting the
command.
