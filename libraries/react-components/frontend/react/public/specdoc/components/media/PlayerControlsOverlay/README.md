# PlayerControlsOverlay

## API

```ts
type PlayerControlsOverlayProps = {
  state: 'playing' | 'paused' | 'buffering' | 'reconnecting' | 'error';
  positionSeconds: number;
  durationSeconds: number;
  captionsOn?: boolean;
  errorMessage?: string;
  onPlayPause / onSeek / onToggleCaptions? / onOpenSettings? / onCast? / onFullscreen?
};
```

## The media engine is authoritative

This component renders what the engine reports and sends commands back. **It
never predicts.** A scrubber driven by optimistic state drifts from the video
within seconds and the two never reconcile.

That is also why there is no Action here. React 19 Actions belong to the
_preferences_ around playback — saving the watch position, a subtitle choice, a
quality setting — not to playback itself.

## Transient states are announced

"Buffering…", "Trying to reconnect…", "Video unavailable" in an `aria-live`
region with reserved height. A spinner over a black frame tells a screen-reader
user nothing.

## Labels

"Pause", "Seek back 10 seconds", "Turn captions on" (with `aria-pressed`),
"Audio, subtitles and quality", "Cast to a device", "Full screen". The scrubber
announces _"1:02:22 of 2:46:00"_ rather than a raw second count.
