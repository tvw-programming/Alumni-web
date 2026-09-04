## Component Specification

### Name & Purpose
`productInput` — the write contract shared by the JSON and multipart paths.
Validates and converts a request into a `model.Product` or a partial patch.

### Location
`api/internal/handler/product_dto.go`

### Public Interface
Package-private by design — the handler is the only caller.

```go
type productInput struct {
    ProductID       *string  `json:"productId"`
    ProductName     *string  `json:"productName"`
    Description     *string  `json:"description"`
    Price           *string  `json:"price"`      // string, not float
    Rating          *int16   `json:"rating"`
    Comments        *string  `json:"comments"`
    ReleaseDate     *string  `json:"releaseDate"` // YYYY-MM-DD
    SupportEmail    *string  `json:"supportEmail"`
    SupportPhone    *string  `json:"supportPhone"`
    ProductURL      *string  `json:"productUrl"`
    ThemeColor      *string  `json:"themeColor"`
    Condition       *string  `json:"condition"`
    Availability    *string  `json:"availability"`
    Tags            []string `json:"tags"`
    ShippingRegions []string `json:"shippingRegions"`
    WarrantyMonths  *int16   `json:"warrantyMonths"`
    IsPublished     *bool    `json:"isPublished"`
    AcceptTerms     *bool    `json:"acceptTerms"`
    Category        *string  `json:"category"`
}

// partial=false → create (required checks on); partial=true → PATCH
func (in productInput) toModel(partial bool) (*model.Product, map[string]any, error)

func fromForm(get func(string) string, has func(string) bool,
              getAll func(string) []string) productInput
```

### Dependencies
- Internal: `apperror`, `model`.
- External: `shopspring/decimal`, `lib/pq`.

### Data Models
Produces `*model.Product` (create) and `map[string]any` keyed by **column name**
(update).

### Business Rules & Constraints

**Every field is a pointer.** That is what makes "absent" distinguishable from
"explicitly empty", and it is what makes PATCH possible without a second type:

- `nil` → the caller did not mention this field → leave it alone
- `&""` → the caller cleared it → write `NULL`

**One struct for both transports.** A multipart request decodes through
`fromForm` into the same `productInput` and then follows exactly the same
validation. Two endpoints validating differently is the usual failure mode when
upload support is bolted on beside an existing JSON endpoint.

**Arrays arrive as repeated keys.** That is what an HTML checkbox group posts:

```go
multi := func(key string) []string {
    values := getAll(key)                       // tags=a&tags=b
    if len(values) == 1 && strings.Contains(values[0], ",") {
        …                                       // also accept "a,b"
    }
    return values
}
```
A single `tags=a,b` would otherwise be indistinguishable from one tag literally
named `a,b`.

**Validation is duplicated in the database on purpose.** This layer produces a
message naming the field (`"productId: must be 3–15 characters"`); the CHECK
constraint guarantees the rule holds even for a writer that bypasses this code.

**Required-on-create rules** (relaxed when `partial`): `productId` (3–15),
`productName`, `description` (≤500), `price` (≥0), `releaseDate`,
`condition`, `category`, `shippingRegions` (non-empty), `acceptTerms` (must be
true).

**`acceptTerms` is never silently defaulted.** The form asks the user to accept;
a stored row that never did is a bug, not a state to handle.

**Arrays are initialised, never left nil:**

```go
product.Tags = pq.StringArray{}
product.ProductDocumentPaths = pq.StringArray{}
```
A nil slice is written as explicit `NULL`, which `NOT NULL DEFAULT '{}'` does not
cover.

### Extension Points

- **A new field:** add a pointer to `productInput`, a branch in `toModel`, a line
  in `fromForm`, and the column to the migration.
- **A new enum:** add a `map[string]bool` beside `validConditions` and call the
  shared `enum(...)` helper.
- **A DTO for another entity:** copy this file's shape. The pointer-for-every-field
  rule and the shared `toModel(partial bool)` are the parts worth keeping.
