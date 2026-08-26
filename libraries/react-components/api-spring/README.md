# api-spring — the simplest Spring Boot port of the Go API

Same database, same endpoints, same JSON. Written to be read start to finish,
not to be extended.

## Running

```bash
# from the repository root
docker compose --profile spring up -d --build api-spring
curl -s localhost:8082/health
```

It shares the Postgres instance the Go API uses and runs **no migrations** —
`db/init/*.sql` stays the single source of truth for the schema. Both APIs can
run at the same time, on different ports.

| | Go (Fiber) | Java (Spring Boot) |
|---|---|---|
| Port | 8081 | 8082 |
| Source files | 39 | 7 |

## What it does

| Method | Path | Auth |
|---|---|---|
| POST | `/api/auth/login` | — |
| POST | `/api/auth/refresh` | refresh cookie |
| POST | `/api/auth/logout` | — |
| GET | `/api/auth/me` | Bearer |
| POST | `/api/auth/forgot-password` | — |
| POST | `/api/auth/reset-password` | — |
| GET | `/api/products` | — |
| GET | `/api/products/{id}` | — |
| POST | `/api/products` (JSON **or** multipart) | Bearer |
| PATCH | `/api/products/{id}` | Bearer |
| DELETE | `/api/products/{id}` | Bearer |
| GET | `/api/items` | — |
| GET | `/health`, `/livez`, `/readyz` | — |

## The seven files

| File | What is in it |
|---|---|
| `Application.java` | main, bcrypt bean, CORS |
| `AuthController.java` | every session endpoint |
| `ProductController.java` | products, uploads, the column map |
| `ItemController.java` | items and health |
| `Jwt.java` | HS256 sign and verify, by hand |
| `ApiException.java` / `ErrorHandler.java` | the error envelope |

Four dependencies: `web`, `jdbc`, `spring-security-crypto`, the Postgres driver.
No JWT library — `Jwt.java` is fifteen lines of `javax.crypto`. No JPA — the SQL
is written where it runs.

## What is deliberately missing

This is the honest part. The Go API is not larger by accident; the difference is
mostly things this app chose not to do:

- **Rate limiting** on the credential endpoints, and **per-account lockout**.
  Nothing here slows down a password-guessing loop.
- **Keyset pagination.** Page 500 of a large table scans and discards 12,475
  rows, because `OFFSET` does exactly that.
- **`COUNT(*) on every list request**, even when the caller does not need a
  total. The Go API makes counting opt-in.
- **Optimistic concurrency.** The `version` column is returned and never
  checked, so two simultaneous edits will not conflict — the second silently
  wins.
- **Request IDs, structured logs, audit records, idempotency keys, the
  background worker, OpenAPI.**
- **Any layering.** Controllers hold SQL. There is no service to unit-test and
  no repository to swap. Adding a second caller for any of these queries means
  copying them.
- **Tests.** There are none.

What it does keep, because leaving them out would be a security bug rather than
a simplification:

- bcrypt at cost 12, so hashes verify against the ones the Go API wrote
- one sign-in error message for both "no such account" and "wrong password"
- refresh tokens stored as SHA-256 hashes, rotated on every use
- httpOnly, SameSite=Lax refresh cookie; the access token stays in memory
- an allow-list for sortable columns, and placeholders everywhere else
- random upload filenames, so a client-supplied name is never a path
- `alg` never read from the token being verified
