# MeditationPlayerCard

A guided session.

## API

```ts
type MeditationPlayerCardProps = {
  session: MeditationSession;    // title, teacher?, category, durationLabel, positionPercent?, favourite, downloaded?
  playback: 'idle' | 'playing' | 'paused' | 'buffering' | 'unavailable';
  sleepTimerLabel?: string; sleepTimerOptions?: number[];
  onPlayPause / onToggleFavourite / onSetSleepTimer? / onDownload?
};
```

## React 19

`useOptimistic` for **favouriting** — the user's own list.

**Not for completion.** A session counts as finished when the audio engine says
so; a mindful-minute total that includes sessions nobody listened to is a number
that means nothing.

## "Begin" / "Continue" / "Pause"

`positionPercent` decides the verb. Returning to a half-finished session is the
normal case for this content, not an edge.

## The sleep timer is on the card

Not in a settings screen. It is decided at the moment of pressing play, usually
in the dark.

## Notes

Playback belongs to a shared audio-session controller so background audio, route
changes and the lock screen keep working. Buffering and "Playback unavailable"
are `role="status"`, because a silent player is indistinguishable from a broken
one.
