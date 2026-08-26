# SeasonSelector

## API

```ts
type SeasonSelectorProps = {
  seasons: Season[]; // label, episodeCount, year?, unavailableReason?
  selectedId: string;
  onChange: (seasonId: string) => void;
};
```

## A select, not tabs

Shows with eighteen seasons overflow a tab strip, and the horizontal scroll that
results is the worst way to choose one item from many.

## Each option carries context

"Season 2 · 10 episodes · 2025". "Season 3" alone does not help someone deciding
where they left off two years ago.

An unavailable season stays listed and disabled with its reason ("Coming in
October") rather than disappearing.
