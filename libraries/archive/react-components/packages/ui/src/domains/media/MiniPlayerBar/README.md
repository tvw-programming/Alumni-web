# MiniPlayerBar

The docked player.

## API

```ts
type MiniPlayerBarProps = {
  title: string;
  subtitle?: string;
  artworkUri?: string;
  playing: boolean;
  progressPercent: number;
  remainingLabel?: string;
  onPlayPause: () => void;
  onExpand: () => void;
  onClose: () => void;
};
```

## Three separate targets

Expand, play/pause, close — deliberately separated. A bar where the whole surface
expands and a 24px X closes is one where people close the player by accident,
constantly, while walking.

Close is labelled with its consequence: _"Close player, stop playing Signal
Lost."_

## Playback state

From the media engine, exactly as in `PlayerControlsOverlay`. This bar renders it
and sends commands; it predicts nothing.
