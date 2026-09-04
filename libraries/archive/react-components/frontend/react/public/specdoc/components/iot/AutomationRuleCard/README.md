# AutomationRuleCard

## API

```ts
type AutomationRuleCardProps = {
  rule: AutomationRule; // name, summary, enabled, lastRunAt?, pausedReason?
  onToggleEnabled: (enabled: boolean) => Promise<void>;
};
```

## `summary` is a sentence, not a rule tree

_"If motion is detected after sunset, turn on hallway lights at 30% for 5
minutes."_ Automations are written once and read for years, usually by someone
who did not write them. A trigger/condition/action tree is unreadable at a
glance.

## React 19

`useOptimistic` — and unlike `DeviceCard`, there is **no acknowledgement to wait
for**: enabling an automation flips a stored flag rather than commanding a
physical device.

## A paused rule says why

"Paused · trigger device was removed". "Paused" alone leaves the user toggling a
switch that turns itself off again.

## "Has not run yet"

Better than an empty space — it distinguishes a new automation from a broken one.
