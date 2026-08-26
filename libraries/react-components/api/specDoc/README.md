# API specification documents

Machine-readable specifications for the Go API, written so an LLM can generate
correct code against this codebase without reading every file.

## Why this folder structure

Grouped **by layer, then by feature**, because that is the axis along which the
conventions change. A generator working in `products/` needs to know the
repository conventions; a generator working in `core/` needs to know the error
contract. Feature-only grouping would repeat the layer conventions in every
folder; layer-only grouping would scatter one feature across five.

```
specDoc/
├── core/       cross-cutting: config, errors, middleware, pagination
├── auth/       identity: tokens, passwords, sessions, guards
├── products/   the reference CRUD feature — copy this shape for new tables
├── uploads/    file storage
└── data/       the database schema, as the source of truth
```

## Reading order for a new feature

1. [`core/pagination.md`](core/pagination.md) — the list contract every
   collection endpoint implements
2. [`core/apperror.md`](core/apperror.md) — how failures become responses
3. [`products/product-repository.md`](products/product-repository.md) — the
   repository template
4. [`products/product-handler.md`](products/product-handler.md) — the handler
   template, including the JSON/multipart split
5. [`auth/auth-middleware.md`](auth/auth-middleware.md) — how a route is gated

## Conventions that hold everywhere

| Rule | Why |
| --- | --- |
| Handlers return `*apperror.Error`; the error middleware renders it | One place decides status codes and response shape |
| Repositories return `ErrNotFound` / `ErrDuplicate`, never a driver error | Handlers must not import GORM or a Postgres driver |
| Every request-scoped call takes a `context.Context` with the configured timeout | A slow database must not hold a connection open forever |
| Anything reaching `ORDER BY` is whitelisted through a map | Parameter binding does not work for identifiers; interpolation is injection |
| Money is `decimal.Decimal` / `NUMERIC`, never a float | Binary floating point cannot represent 19.99 |
| Validation exists in **both** the handler and the database | The handler produces a readable message; the constraint is the guarantee |

## Stack

Go 1.25 · Fiber v2 · GORM · PostgreSQL 16 · `golang-jwt/v5` · `x/crypto/bcrypt`
