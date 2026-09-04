## Component Specification

### Name & Purpose

`ProductController` — the products endpoint. List with three pagination modes,
read with an ETag, create from JSON or multipart, conditional update and delete.
It is the only endpoint with substantial behaviour.

### Location

`src/main/java/com/idol/api/ProductController.java`

### Public Interface

```java
@RestController
@RequestMapping("/api/products")
class ProductController {
  @GetMapping    Map<String, Object> list(String mode, int page, int pageSize, String cursor,
                                          boolean withTotal, String search, String sortBy,
                                          String sortDir, Map<String, String> allParams);
  @GetMapping("/{id}")  ResponseEntity<Map<String, Object>> get(long id);

  @PostMapping(consumes = "application/json")     ResponseEntity<?> createJson(...);
  @PostMapping(consumes = "multipart/form-data")  ResponseEntity<?> createMultipart(...);

  @PatchMapping("/{id}")  ResponseEntity<Map<String, Object>> patch(long id, Map<String, Object> input,
                                                                   String ifMatch, HttpServletRequest request);
  @DeleteMapping("/{id}") ResponseEntity<Void> delete(long id, String ifMatch, HttpServletRequest request);
}
```

### Dependencies

- Internal: `AuthController` (permissions), `Idempotency`, `Audit`,
  `ApiException`.
- Spring: `JdbcTemplate`, `MultipartFile`, `ResponseEntity`.
- Table: `products` (21 columns plus `version`, `created_at`, `updated_at`).

### Data Models

The page envelope, identical to the Go API's:

```json
{"items": [...], "total": 5, "page": 1, "pageSize": 25, "hasMore": true,
 "nextCursor": "MTc4NTkzMjA1Mj…"}
```

JSON name to column, the only place the two vocabularies meet:

```java
COLUMNS.put("productId", "product_id");
COLUMNS.put("productName", "product_name");
COLUMNS.put("productDocumentPaths", "product_document_paths");
COLUMNS.put("shippingRegions", "shipping_regions");
// …21 entries
```

Sortable columns are a whitelist, mapping API name to column:

```java
Map.of("productId", "product_id", "productName", "product_name", "price", "price",
       "rating", "rating", "releaseDate", "release_date", "category", "category",
       "createdAt", "created_at");
```

### Business Rules & Constraints

**Reads are public, writes need a capability.** `products:create`,
`products:update`, `products:delete` — all held by `admin` only. Gating reads
would put a login in front of every public page.

**`total` is null when it was not counted**, which is deliberately different from
`0`. On a filtered table a `COUNT` costs about as much as the page, so
`withTotal=false` exists and its answer must not look like "none".

**Keyset only on the default ordering.** A cursor is meaningful only against the
sort that produced it, so any other sort is refused with `INVALID_CURSOR` rather
than silently returning wrong rows.

**The cursor keeps nanosecond precision:**

```java
long nanos = (timestamp.getTime() / 1000L) * 1_000_000_000L + timestamp.getNanos();
```

Milliseconds are not enough — rows created in one batch share a `created_at` to
the microsecond, and a truncated cursor sorts _before_ the row it came from, so
the next page comes back empty. This was measured, not assumed.

**Keyset seeks with a row-value comparison**, `(created_at, id) < (?, ?)`, so the
composite index is used directly rather than as a filter applied afterwards. One
extra row is fetched to answer "is there more" without a second query.

**`ORDER BY` can only be a whitelisted column.** An identifier cannot be a bound
parameter, so the allow-list is the only thing standing between this and
injection. Everything else in every query is a placeholder.

**The version is bumped in the statement that writes the change:**

```sql
UPDATE products SET price = ?, version = version + 1, updated_at = NOW()
WHERE id = ? AND version = ?
```

so a reader can never see new data carrying an old version. A failed
precondition is **412**, and `conflictOrNotFound` distinguishes "gone" (404) from
"changed under you" (412) — both make the statement affect zero rows and they
need different answers.

**Absent and null mean different things in a PATCH.** Only keys present in the
body are written, which is why the input is a `Map` rather than a DTO whose
unset fields would be indistinguishable from nulls.

**Array columns are sent even when absent on create:**

```java
for (String column : ARRAY_COLUMNS) {
  if (!columns.contains(column) && !column.equals("shipping_regions")) {
    columns.add(column); args.add(array(List.of()));
  }
}
```

`product_document_paths` is `NOT NULL DEFAULT '{}'`, and a DEFAULT does not apply
when the client sends an explicit NULL — which is what an absent list becomes.
Without this, every create fails on the constraint.

**Array values are bound as a PostgreSQL literal and cast (`?::text[]`), never
built with `createArrayOf`.** That method needs a live connection, and taking one
from the pool to build a value the caller keeps means it is never returned. The
first version of this code did exactly that: a handful of writes emptied the
ten-connection pool and every later request became a thirty-second
`CannotGetJdbcConnection` timeout. Quotes, backslashes and commas inside a tag
are escaped by `array()` and round-trip intact.

**Price is a string in JSON and `NUMERIC(12,2)` in the database.** Never a
double: 19.99 has no exact binary representation, and money that drifts by a cent
is money that is wrong.

**No application validation.** Length, range, enum, uniqueness and "terms must be
accepted" are all `CHECK` constraints; a violation becomes `VALIDATION_ERROR`, or
`DUPLICATE_PRODUCT_ID` when the unique index on `product_id` is the one that
fired.

**Uploads get a random name.** A client-supplied filename can contain `../` or a
shell character, so it is never used as a path — only its extension survives.

### Extension Points

- **A new product field** — one line in `COLUMNS`; the row mapper, insert and
  patch all read that map.
- **A new filter** — a branch in `applyFilters`, which the count and the page
  share so the two cannot drift. A count that filters differently from its page
  is a pager that lies.
- **Keyset on another sort** — would need a cursor carrying that column, and the
  refusal in `list` is where to start.
- **Soft delete** — not supported; `DELETE` removes the row.
