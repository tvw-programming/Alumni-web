# VideoCallControls

The control bar for a consultation.

## API

```ts
type VideoCallControlsProps = {
  micEnabled: boolean;
  cameraEnabled: boolean;
  quality: 'good' | 'fair' | 'poor' | 'reconnecting';
  elapsedSeconds: number;
  unreadMessages?: number;
  screenSharing?: boolean;
  onToggleMic / onToggleCamera / onToggleScreenShare / onOpenChat / onEndCall
};
```

## React 19

**None, deliberately.** Nothing on this bar is a mutation. Mute belongs to the
media engine and must be local and immediate — a mute that waits for a network
round trip fails exactly when the network is the reason you are muting.

Saving a preference for next time is a separate Action, elsewhere.

## Quality wording

"Connection poor — try turning off your camera" suggests the fix rather than
only reporting the problem, and it is a `role="status"` chip, never a bare
coloured dot.

## Accessibility

Every toggle carries `aria-pressed` and a label that names the _action_, not the
state: "Mute microphone" / "Unmute microphone". The chat button announces its
unread count. End call is visually distinct and separated from the toggles.
