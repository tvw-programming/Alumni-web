## Component Specification

### Name & Purpose
`ProductHandler` — the products HTTP surface. One handler accepts **both** JSON
and multipart; the transport is chosen by `Content-Type`, not by URL.

### Location
`api/internal/handler/product_handler.go`

### Public Interface

```go
func NewProductHandler(repo repository.ProductRepository,
                       uploads *upload.Store, timeout time.Duration) *ProductHandler

func (h *ProductHandler) List(c *fiber.Ctx) error    // GET    /api/products
func (h *ProductHandler) Get(c *fiber.Ctx) error     // GET    /api/products/:id
func (h *ProductHandler) Create(c *fiber.Ctx) error  // POST   /api/products
func (h *ProductHandler) Update(c *fiber.Ctx) error  // PATCH  /api/products/:id
func (h *ProductHandler) Delete(c *fiber.Ctx) error  // DELETE /api/products/:id
```

Routing (`cmd/server/main.go`):

```go
products := app.Group("/api/products")
products.Get("/",       productHandler.List)     // open: the grid renders without a session
products.Get("/:id",    productHandler.Get)
products.Post("/",      handler.RequireAuth(tokenIssuer), productHandler.Create)
products.Patch("/:id",  handler.RequireAuth(tokenIssuer), productHandler.Update)
products.Delete("/:id", handler.RequireAuth(tokenIssuer),
                        handler.RequireRole("admin"), productHandler.Delete)
```

### Dependencies
- Internal: `repository.ProductRepository`, `upload.Store`, `pagination`,
  `apperror`, `model`, `productInput`.
- External: Fiber.

### Data Models

**List** — three modes:

```
GET /api/products?page=2&pageSize=25          numbered pages (default)
GET /api/products?mode=keyset&cursor=…        constant-time deep paging
GET /api/products?mode=all                    everything matching the filters
GET /api/products?withTotal=false             skip the COUNT
GET /api/products?search=lamp&category=home&tag=eco&sortBy=price&sortDir=desc
```

Response is `pagination.Page[Product]`. **Create returns 201 with the created
row** — that is what lets a client insert it directly instead of refetching.

### Business Rules & Constraints

**Transport is chosen, not duplicated:**

```go
func (h *ProductHandler) decode(c *fiber.Ctx) (productInput, uploadedFiles, error) {
    if !strings.HasPrefix(contentType, "multipart/form-data") {
        var in productInput
        if err := c.BodyParser(&in); err != nil { … }
        return in, uploadedFiles{}, nil
    }
    form, err := c.MultipartForm()
    …
    return fromForm(…), uploadedFiles{
        image:     form.File["productImage"],
        documents: form.File["productDocuments"],
    }, nil
}
```

A caller should not need a different URL because it happens to have a file.

**Files are saved only after validation passes**, so a rejected request leaves no
orphans on disk.

**A bad cursor is 400, not 500.** It is the caller's mistake.

**`PATCH` is partial** — only fields present in the request change. Files sent
with a PATCH replace the corresponding column.

**Read/write split is deliberate.** Reads are open because this is the showcase
data and gating them would make public pages require a login; writes require a
session, and delete additionally requires `admin`.

**Error mapping:**

| Repository result | Response |
| --- | --- |
| `ErrNotFound` | 404 `NOT_FOUND` |
| `ErrDuplicate` | 409 `DUPLICATE_PRODUCT_ID` |
| validation | 422 `VALIDATION_FAILED`, message names the field |
| bad upload | 422 `INVALID_UPLOAD` |

### Extension Points

- **A new endpoint for this entity:** add to the `products` group with the right
  guard.
- **A handler for another entity:** copy this file. The parts to keep are
  `decode` (the JSON/multipart split), the `parseID` guard, the error mapping
  table, and returning the created row from `Create`.
- **Bulk operations:** a new method taking a slice; wrap the repository calls in
  one transaction — not currently implemented.
