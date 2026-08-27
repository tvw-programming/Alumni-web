# VideoCallControls

## Benchmark references

| App | Kind | What we took |
|---|---|---|
| **Zoom** | Design | Control cluster centred, with **end call separated** from the toggles — the one irreversible control should not sit a mis-tap from mute. |
| **Zoom** | Feature | Device settings reachable from the bar during the call, not only before joining. |
| **Zoom** | Feature | "End for all" distinct from "Leave", exposed only to the host. |
| **Doxy.me** | Design | Clinical framing: call duration shown as text because consultations are billed by duration. |
| **Amwell** | Feature | Connection-quality indicator with a degraded state announced, so a patient knows whether the silence is them or the line. |
| **Google Meet** | Design | "Off" states rendered as a filled inversion rather than a faint icon — a muted mic must be unmistakable on a phone in daylight. |
| **Microsoft Teams** | Feature | Screen share as a toggle with its own pressed state rather than a separate mode. |
| **Doctor Anywhere** | Design | Bar clears the iOS home indicator via `env(safe-area-inset-bottom)`. |

## The distinction this component insists on

**"Muted" and "no microphone permission" are different states.** A greyed-out
mic button that actually means *"you denied access in a browser dialog three
weeks ago"* is the most common dead end in a telehealth call — the patient taps
it repeatedly and nothing happens.

So `micPermission` is modelled separately from `micEnabled`:

- **muted** → button offers unmute, `aria-pressed="false"`;
- **blocked** → button is styled differently, emits `requestPermission` instead
  of toggling, and a `role="alert"` message names the remedy ("Allow access from
  the address bar, then rejoin").

`aria-pressed` is omitted entirely when blocked, because the control is no
longer a toggle.

## Accessibility

- `role="toolbar"` with a labelled group.
- Every icon button has an accessible name that states the *action*
  ("Mute microphone"), not the state.
- Degraded connection carries `role="status"`; good connection does not, so the
  reader is not interrupted for normal operation.
- Timer is `tabular-nums` text.

## Usage

```html
<app-video-call-controls
  [devices]="call.devices()"
  [quality]="call.quality()"
  [elapsedSeconds]="call.elapsed()"
  [canEndForAll]="session.isClinician()"
  (toggleMic)="call.setMic($event)"
  (toggleCamera)="call.setCamera($event)"
  (requestPermission)="call.requestPermission($event)"
  (endCall)="call.leave()"
/>
```
