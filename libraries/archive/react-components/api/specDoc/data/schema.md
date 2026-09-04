## Component Specification

### Name & Purpose
The PostgreSQL schema — the source of truth for every entity. Applied by
`docker-entrypoint-initdb.d` **only when the data volume is created**, so a
change requires `docker compose down --volumes`.

### Location
`db/init/001_items.sql`, `002_auth.sql`, `003_products.sql`

### Public Interface

Tables: `items`, `users`, `refresh_tokens`, `password_reset_tokens`, `products`.
Shared function: `set_updated_at()`, used by an `updated_at` trigger on `users`
and `products`.

### Dependencies
- Internal: `003_products.sql` reuses the trigger function from `002_auth.sql`,
  so file order matters.
- External: extensions `citext` (case-insensitive email), `pg_trgm` (partial-word
  search).

### Data Models

**users** — identity and the password verifier
```sql
id BIGSERIAL PK, email CITEXT UNIQUE NOT NULL, password_hash VARCHAR(255) NOT NULL,
display_name VARCHAR(120) NOT NULL, role VARCHAR(32) NOT NULL DEFAULT 'user',
is_active BOOLEAN NOT NULL DEFAULT TRUE,
failed_login_attempts INTEGER NOT NULL DEFAULT 0, locked_until TIMESTAMPTZ,
last_login_at TIMESTAMPTZ, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ
CHECK role IN ('admin','user');  CHECK POSITION('@' IN email) > 1
```

**refresh_tokens** — one row per device
```sql
id BIGSERIAL PK, user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
token_hash CHAR(64) UNIQUE NOT NULL,   -- SHA-256 hex, never the token
expires_at TIMESTAMPTZ NOT NULL, revoked_at TIMESTAMPTZ,
user_agent VARCHAR(255), ip_address INET, created_at TIMESTAMPTZ
```

**password_reset_tokens** — single-use grants
```sql
id BIGSERIAL PK, user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
token_hash CHAR(64) UNIQUE NOT NULL, expires_at TIMESTAMPTZ NOT NULL,
used_at TIMESTAMPTZ, created_at TIMESTAMPTZ
```

**products** — 21 columns derived one-for-one from the schema-demo form
```sql
id BIGSERIAL PK, product_id VARCHAR(15) UNIQUE NOT NULL,
product_name VARCHAR(100) NOT NULL, description VARCHAR(500) NOT NULL,
price NUMERIC(12,2) NOT NULL, rating SMALLINT NOT NULL DEFAULT 0,
product_image_path TEXT, product_document_paths TEXT[] NOT NULL DEFAULT '{}',
comments TEXT, release_date DATE NOT NULL, support_email CITEXT,
support_phone VARCHAR(32), product_url TEXT, theme_color VARCHAR(9),
condition VARCHAR(16) NOT NULL, availability VARCHAR(16) NOT NULL DEFAULT 'inStock',
tags TEXT[] NOT NULL DEFAULT '{}', shipping_regions TEXT[] NOT NULL,
warranty_months SMALLINT NOT NULL DEFAULT 0,
is_published BOOLEAN NOT NULL DEFAULT FALSE, accept_terms BOOLEAN NOT NULL DEFAULT FALSE,
category VARCHAR(32) NOT NULL, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ
```

### Business Rules & Constraints

**No table stores a secret it could hand back.** Passwords are bcrypt verifiers;
both token tables store a SHA-256 of the token. A dump of this database cannot be
replayed against the API.

**Types express what the data *is*:**
- `price NUMERIC(12,2)` — never `FLOAT`. Binary floating point cannot represent
  19.99.
- multi-value fields are `TEXT[]` — queryable with array operators, indexable
  with GIN.
- uploads store a **path**. Postgres is not a file server.

**Enums are CHECK constraints, not application-only rules.** The form can be
edited by anyone with the file; the constraint cannot.

**Indexes, and what each is for:**

| Index | Serves |
| --- | --- |
| `products_created_at_id_idx (created_at DESC, id DESC)` | the default list ordering *and* keyset seeks — both columns, that exact order |
| `products_category_idx`, `products_published_idx` (partial) | list filters |
| `products_tags_gin`, `products_shipping_regions_gin` | `tags @> ARRAY[…]` containment |
| `products_name_trgm_idx` (GIN, `gin_trgm_ops`) | `ILIKE '%term%'` — plain `to_tsvector` cannot do partial words |
| `refresh_tokens_active_idx` (partial, `WHERE revoked_at IS NULL`) | refresh lookups; excludes dead rows |

**`NOT NULL DEFAULT '{}'` does not save a nil client value.** A DEFAULT applies
only when the column is omitted; an explicit `NULL` is rejected. Go code must
initialise `pq.StringArray{}`.

**Seed credentials are published.** `admin@gmail.com` /
`user@gmail.com`, password `Password123!` (bcrypt cost 12, generated and
verified). They are in a committed file — treat both accounts as compromised
anywhere real.

### Extension Points

- **A new table:** a new numbered file. Reuse `set_updated_at()` for the trigger.
- **A new column:** add to the DDL *and* the Go model — GORM does not migrate
  here.
- **Real migrations:** these files are init-only and do not run against an
  existing volume. A production change needs a migration tool (golang-migrate,
  Atlas). **Not implemented.**
