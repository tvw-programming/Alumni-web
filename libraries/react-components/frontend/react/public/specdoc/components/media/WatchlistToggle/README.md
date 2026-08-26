# WatchlistToggle

## API

```ts
type WatchlistToggleProps = {
  contentId: ContentId;
  title: string;
  inWatchlist: boolean;
  variant?: 'icon' | 'button';
  onToggle: (next: boolean) => Promise<void>;
};
```

## React 19

`useOptimistic`. The user's own list, reversible, and a tick that waits for a
round trip is noticeable on every poster in a rail.

## The label names the action

"Add Dune: Part Two to watchlist" / "Remove Dune: Part Two from watchlist", with
`aria-pressed` carrying the state. A button labelled "In watchlist" leaves a
screen-reader user guessing what pressing it does — and the title is in the label
because a rail contains twenty of these.
