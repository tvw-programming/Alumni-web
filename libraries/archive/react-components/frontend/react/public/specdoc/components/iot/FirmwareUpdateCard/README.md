# FirmwareUpdateCard

## API

```ts
type FirmwareUpdateCardProps = {
  update: FirmwareUpdate; // deviceName, currentVersion, availableVersion?, phase, progress?, failureReason?
  onInstall: () => Promise<void>;
};
```

Phases: `upToDate | available | downloading | installing | restarting | complete
| failed`.

## "Keep the device powered on"

On screen during install, not in a help article. A power cut mid-flash bricks
hardware, and the moment the user needs that sentence is the moment they are
deciding whether to unplug it.

## Determinate only when it is

Progress is a real bar while downloading (the device reports bytes) and
indeterminate while installing. A fake bar during install sits at 90% for four
minutes and teaches users the app is stuck.

## Failure states the consequence

_"The device is still on its previous version."_ After a failed firmware update,
that is the only question the user has.

## React 19

`useActionState` starts the job. The **phase comes from the device**, so persist
it server-side: the user will background the app mid-update.
