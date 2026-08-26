# DataTableWrapper

A controlled table.

## API

```ts
type DataTableWrapperProps<T> = {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  sort?: SortState;
  page?: number; pageSize?: number; total?: number;
  selectedIds?: string[];
  loading?: boolean;
  onSortChange? / onPageChange? / onSelectionChange?
};
```

## Everything is controlled

Sort, page and selection are props. Holding them internally makes the URL unable
to describe what is on screen — and a dashboard view that cannot be linked to is
one nobody shares.

## The mobile fallback is not optional

Below `md` the table becomes one card per row, primary columns only. Eight
columns on a 390px screen is a horizontal scroll nobody discovers.

## React 19

Bulk mutations are the caller's Actions. `useOptimistic` suits row archive,
status and assignment where rollback exists; `useActionState` reports the bulk
result. Never predict a _count_ — "12 rows archived" must come from the server.

## Accessibility

- `aria-sort` on the active header, so the sort is audible. A click handler on a
  styled `div` never provides it.
- Selection count in a `role="status"` region.
- Select-all is labelled "Select all rows" / "Clear selection" by state.
- The loading bar has reserved height, so a refetch cannot push the first row
  under the pointer.
