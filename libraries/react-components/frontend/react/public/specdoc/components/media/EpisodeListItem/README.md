# EpisodeListItem

## API

```ts
type EpisodeListItemProps = {
  episode: Episode; // number, title, synopsis, durationLabel, progressPercent?, unavailableReason?, releasesOn?
  onPlay: () => void;
};
```

## The synopsis stays visible

Clamped to two lines, not hidden behind an expander. A viewer choosing where to
resume otherwise has to open five episodes to find the one they remember.

## Unaired episodes are listed

With the date: **"Releases 28 Aug"** is the single most-wanted piece of
information on a season page. Omitting them makes a season look shorter than it
is.

## Accessibility

One label per row, ending with the synopsis: _"Episode 4, The Long Silence,
48 min, 62 percent watched, Maya traces the signal…"_ The still is `alt=""` and
the progress bar is `aria-hidden` — the percentage is already in the label.
