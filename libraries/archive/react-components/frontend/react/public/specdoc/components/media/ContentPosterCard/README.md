# ContentPosterCard

## API

```ts
type ContentPosterCardProps = {
  item: ContentItem; // title, posterUri?, year?, maturityRating?, progressPercent?, unavailableReason?
  orientation?: 'portrait' | 'landscape';
  onPlay: () => void;
  onToggleWatchlist?: (next: boolean) => Promise<void>;
};
```

## The title is text, not artwork

Rendered under the poster, with `alt=""` on the image. A poster-only rail is
unreadable to a screen reader and unusable when the CDN is slow — and both happen
constantly.

## `unavailableReason` is stated

"Not available in your region" on the tile prevents a click, a spinner and a dead
end. The poster greys out and the action area is disabled.

## React 19

`useOptimistic` for the watchlist (via `WatchlistToggle`). Recommendations and
availability stay server-authoritative.

## Performance

`memo`, fixed aspect ratios per orientation, and stable keys — a rail is
horizontally virtualised and re-renders as it scrolls.
