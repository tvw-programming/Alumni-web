# SceneCard

## API

```ts
type SceneCardProps = {
  scene: Scene; // name, summary, deviceCount
  onRun: () => Promise<SceneRunResult>; // { succeeded, total, failed: string[] }
};
```

## Partial failure is the normal case

Scenes touch several devices; one bulb is unplugged, one switch is out of range.
**"3 of 4 devices updated. Hallway light did not respond."** is the honest
result, and it is what lets someone fix the one that failed. A green tick over a
partial run teaches users not to trust the app.

That is why `onRun` resolves with a result object rather than `void` — a boolean
cannot express "mostly worked".

## React 19

`useActionState`. The states are "Scene running…", then the outcome — announced
through `role="status"`.

## The summary is plain language

_"Dim the living room to 20%, close the blinds and set the thermostat to 21°."_
Not a device list — the summary is what tells someone whether this is the scene
they meant.
