# ContinueWatchingCard

## API

```ts
type ContinueWatchingCardProps = {
  item: ContinueWatchingItem; // title, episodeLabel?, progressPercent, remainingLabel
  onResume: () => void;
  onRemove?: () => Promise<void>;
};
```

## Time remaining, not percent

"18 min left" is a decision people can make before bed. "62%" is arithmetic they
have to do first.

## Removal on every tile

A continue-watching row that cannot be cleared fills with things the user
abandoned on purpose — the most common complaint about the pattern. Removal is
`useOptimistic`: it is the user's own list, and the tile disappears at once.

## Accessibility

One label: _"Resume Signal Lost, S2 E4 · The Long Silence, 18 min left, 62
percent watched."_ The remove button names the title and the row it is removing
from, since a rail holds a dozen identical Xs.
