# FilterToolbar

## API

```ts
type FilterToolbarProps = {
  search: string;
  filters: FilterDefinition[];
  values: Record<string, string | undefined>;
  resultCount?: number;
  onSearchChange / onFilterChange / onClearAll?
};
```

## Active filters are chips

A filter hidden inside a collapsed dropdown is a filter the user forgets they
set — and then reports the empty table as a bug. Every active filter is visible
and removable in one click.

## React 19

`useDeferredValue` on the search term: the input updates immediately and the
expensive filtered render lags a frame rather than blocking each keystroke. The
field dims slightly while the deferred value catches up.

No Action — filtering is query state, not a mutation. Put it in the URL.

## Accessibility

The result count is a `role="status"` region, so a screen-reader user learns the
filter did something. Each chip's delete button is labelled _"Remove filter
Status Overdue"_ — "Chip" is not a label.
