## Component Specification

### Name & Purpose
`model.Product` — the product entity, plus the whitelists that constrain what a
list request may sort and filter by. Mirrors the schema-demo form both frontends
render.

### Location
`api/internal/model/product.go`

### Public Interface

```go
type Product struct {
    ID          uint64          `json:"id"`
    ProductID   string          `json:"productId"`    // business key, 3–15 chars
    ProductName string          `json:"productName"`
    Description string          `json:"description"`
    Price       decimal.Decimal `json:"price"`        // serialises as a string
    Rating      int16           `json:"rating"`

    ProductImagePath     *string        `json:"productImagePath"`
    ProductDocumentPaths pq.StringArray `json:"productDocumentPaths"`

    Comments     *string   `json:"comments"`
    ReleaseDate  time.Time `json:"releaseDate"`
    SupportEmail *string   `json:"supportEmail"`
    SupportPhone *string   `json:"supportPhone"`
    ProductURL   *string   `json:"productUrl"`
    ThemeColor   *string   `json:"themeColor"`

    Condition       string         `json:"condition"`     // new|refurbished|used
    Availability    string         `json:"availability"`  // inStock|preorder|discontinued
    Tags            pq.StringArray `json:"tags"`
    ShippingRegions pq.StringArray `json:"shippingRegions"`

    WarrantyMonths int16  `json:"warrantyMonths"`
    IsPublished    bool   `json:"isPublished"`
    AcceptTerms    bool   `json:"acceptTerms"`
    Category       string `json:"category"`      // electronics|clothing|books|home

    CreatedAt time.Time `json:"createdAt"`
    UpdatedAt time.Time `json:"updatedAt"`
}

func (Product) TableName() string { return "products" }

var ProductSortColumns = map[string]string{
    "productId": "product_id", "productName": "product_name",
    "price": "price", "rating": "rating",
    "releaseDate": "release_date", "category": "category", "createdAt": "created_at",
}

var ProductFilters = []string{"category", "condition", "availability", "isPublished", "tag", "region"}
```

### Dependencies
- Internal: none.
- External: `shopspring/decimal` (money), `lib/pq` (Postgres `TEXT[]`).

### Data Models
The `products` table — see [`data/schema.md`](../data/schema.md). The field list
is derived one-for-one from
`frontend/react/src/schemas/productSchema.json`, which both frontends render.

### Business Rules & Constraints

- **`Price` is `decimal.Decimal`, never `float64`.** Binary floating point cannot
  represent 19.99; money that does not add up is the classic version of that bug.
  It serialises to JSON as a **string**, and the frontends keep it as a string.
- **Multi-value fields are `pq.StringArray`**, mapping Postgres `TEXT[]` — not a
  comma-joined string, so they can be queried with array operators and indexed
  with GIN.
- **`ProductDocumentPaths` and `Tags` must never be nil when writing.** A nil
  slice is sent as an explicit `NULL`, which the column's
  `NOT NULL DEFAULT '{}'` does **not** cover — a DEFAULT applies only when the
  column is omitted entirely. This caused every create to 500 until fixed.
- **Uploads store a path, never bytes.** Postgres is not a file server.
- **`ProductSortColumns` is the whitelist that keeps `ORDER BY` safe.** Parameter
  binding does not work for identifiers, so anything not in this map must be
  dropped.
- **The enum values are duplicated as database CHECK constraints.** The Go
  validation gives a readable message; the constraint is the guarantee.

### Extension Points

- **A new field:** add to the struct, to `db/init/003_products.sql`, to
  `productInput` in [`product-dto.md`](product-dto.md), and to the form schema
  if users set it.
- **A new sortable column:** one entry in `ProductSortColumns`. Nothing else.
- **A new filter:** add the name to `ProductFilters` and a `case` in
  `applyFilters` — see [`product-repository.md`](product-repository.md).
- **A new entity:** copy this file's shape — struct + `TableName` + a
  `…SortColumns` map + a `…Filters` slice is the whole convention.
