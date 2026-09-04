# SearchWidget

## API

```ts
type SearchWidgetProps = {
  places: Place[];
  initial?: Partial<SearchCriteria>;
  recentSearches?: string[];
  onSearch: (criteria: SearchCriteria) => Promise<void>;
};
```

## React 19

`useActionState`, with validation **inside the Action** returning `fieldErrors`.
"Return date is before departure" then appears under the return date rather than
in a toast that vanishes while the user is looking at the calendar.

No optimistic results. Cached results may be shown only if clearly marked stale.

## The swap button

"Wrong way round" is the most common mistake in a from/to pair, and re-typing two
airports to fix it is the most common annoyance.

## Put the criteria in the URL

A search result that cannot be shared or reloaded is one people screenshot
instead.
