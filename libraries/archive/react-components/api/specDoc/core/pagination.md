## Component Specification

### Name & Purpose
`pagination` — the list-query contract shared by every collection endpoint.
Parses page/cursor/sort/filter parameters and defines the response envelope, so a
second table does not reinvent page handling.

### Location
`api/internal/pagination/pagination.go`

### Public Interface

```go
const (
    DefaultPageSize = 25
    MaxPageSize     = 200
)

type Mode string
const (
    ModeOffset Mode = "offset" // LIMIT/OFFSET — supports "jump to page 40"
    ModeKeyset Mode = "keyset" // seek past a cursor — constant time at depth
    ModeAll    Mode = "all"    // no limit — exports and reference lists
)

type Params struct {
    Mode      Mode
    Page      int               // 1-based, offset mode only
    PageSize  int               // ignored when Mode is ModeAll
    Cursor    string            // opaque, keyset mode only
    Search    string
    SortBy    string            // already resolved to a column name
    SortDesc  bool
    Filters   map[string]string
    WithTotal bool
}

type Page[T any] struct {
    Items      []T    `json:"items"`
    Total      *int64 `json:"total"`      // nil = not counted
    Page       int    `json:"page"`
    PageSize   int    `json:"pageSize"`
    HasMore    bool   `json:"hasMore"`
    NextCursor string `json:"nextCursor,omitempty"`
}

type Query interface { Get(key string) string }

func Parse(q Query, allowedSort map[string]string, allowedFilters []string) Params
func (p Params) Offset() int
```

### Dependencies
- Internal: none. This package is deliberately dependency-free.
- External: none. `Query` is a one-method interface so the package works with
  Fiber, `net/http`, or a test map without importing any of them.

### Data Models
Owns no entity. `Page[T]` is the response envelope for every collection endpoint:

```json
{ "items": [], "total": 4, "page": 1, "pageSize": 25, "hasMore": false }
```

### Business Rules & Constraints

- **`PageSize` is clamped to `MaxPageSize`.** Without a ceiling, `?pageSize=1000000`
  is an unauthenticated way to make the database do arbitrary work.
- **Nonsense values fall back; they do not error.** `page=0`, `page=-3`,
  `page=abc` all yield page 1 — a grid resetting a filter legitimately sends
  `page=0`, and a 400 there is a bug for the user.
- **Sort is whitelisted by mapping an API name to a column name.** Anything not
  in `allowedSort` produces `SortBy == ""`. Parameter binding does not work for
  identifiers, so an unfiltered value in `ORDER BY` is SQL injection.
- **Filters are whitelisted by name.** Unlisted keys are dropped silently.
- **Presence of `cursor` forces `ModeKeyset`,** whatever `mode` says — a caller
  holding a cursor is paging forwards.
- **`Total == nil` means "not counted" and is distinct from `0`.** Counting a
  filtered table costs about as much as fetching the page, and an infinite
  scroll never needs it — `?withTotal=false` skips it.

### Extension Points

- **A new collection endpoint:** call `Parse` with that model's sort map and
  filter list, then hand `Params` to its repository. Nothing here changes.
- **A new sort column:** add it to the model's `…SortColumns` map (see
  [`products/product-model.md`](../products/product-model.md)). Do not touch
  this package.
- **A new mode:** add to the `Mode` constants and to the `switch` in `Parse`;
  every repository's `List` must then handle it or reject it explicitly.

Covered by `api/internal/pagination/pagination_test.go` (8 tests), including the
injection and clamping cases.
