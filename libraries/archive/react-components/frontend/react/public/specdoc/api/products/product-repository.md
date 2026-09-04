## Component Specification

### Name & Purpose

`ProductRepository` — database access for products, and **the template every
other collection repository should copy**. Implements the three pagination modes.

### Location

`api/internal/repository/product_repository.go`

### Public Interface

```go
var ErrDuplicate = errors.New("duplicate")

type ProductRepository interface {
    List(context.Context, pagination.Params) (pagination.Page[model.Product], error)
    GetByID(context.Context, uint64) (*model.Product, error)
    Create(context.Context, *model.Product) error
    Update(context.Context, uint64, map[string]any) (*model.Product, error)
    Delete(context.Context, uint64) error
}

func NewProductRepository(db *gorm.DB) ProductRepository
```

### Dependencies

- Internal: `model`, `pagination`.
- External: GORM (`gorm.io/gorm/clause` for `Returning` and `OrderByColumn`).

### Data Models

Owns `products`. Returns `pagination.Page[model.Product]`.

### Business Rules & Constraints

**One query for the page, one optional query for the count.** The filter is built
by a shared helper so the two cannot drift — a count that filters differently
from its page is a pager that lies:

```go
base := func() *gorm.DB {
    return r.applyFilters(r.db.WithContext(ctx).Model(&model.Product{}), params)
}
if params.WithTotal && params.Mode != pagination.ModeAll {
    var total int64
    if err := base().Count(&total).Error; err != nil { … }
    page.Total = &total
}
query := base()   // a fresh builder — GORM statements are stateful
```

> **Trap:** reusing one builder for both would apply the page's `LIMIT` to the
> `COUNT`.

**Ordering is always total.** Every sort ends with `id`; otherwise rows with
equal sort keys can appear on two pages or neither.

**Keyset uses a row-value comparison**, not `a < x OR (a = x AND b < y)` — the
tuple form is what lets Postgres use the composite index directly:

```go
return q.Where("(created_at, id) < (?, ?)", createdAt, id), nil
```

Keyset is supported **only on the default sort** (`created_at DESC`). A cursor is
meaningful only against the sort that produced it; returning wrong rows for a
different sort would be worse than refusing.

**One extra row is fetched** (`Limit(pageSize + 1)`) to answer "is there more"
without a second query.

**`Update` returns the stored row in one round trip:**

```go
result := r.db.WithContext(ctx).Model(&updated).
    Clauses(clause.Returning{}).Where("id = ?", id).Updates(patch)
```

The row returned is the one the database holds, including anything a trigger
changed (`updated_at`).

**Unique violations become `ErrDuplicate`** (SQLSTATE 23505) so the handler can
answer 409 rather than 500.

**Cursors are opaque** (base64 of `unixNano|id`), so the format can change
without breaking a saved link and nobody treats the value as a row id.

**Search uses the trigram index.** `ILIKE '%term%'` on `product_name` is served
by `products_name_trgm_idx`.

### Extension Points

- **A new filter:** a `case` in `applyFilters`, plus the name in
  `model.ProductFilters`. Array filters use containment (`tags @> ARRAY[?]`),
  which the GIN index serves.
- **A new repository for another table:** copy this file. Replace the model, the
  sort map and the filter cases; `List`'s structure — count, mode switch,
  `pageSize+1`, total ordering — is the part to keep verbatim.
- **Soft delete:** add `deleted_at` and a default scope; every query here would
  need `Unscoped` review first. Not implemented.
