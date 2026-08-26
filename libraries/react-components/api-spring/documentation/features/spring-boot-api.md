# Spring Boot backend API

A Java port of the Go Fiber API in `api/`. Same PostgreSQL database, same
endpoints, same JSON, same error codes. It exists so the two stacks can be
compared on identical behaviour, and it is written flat — controllers hold SQL —
so the whole thing reads in one sitting.

**Ports:** Go `8081`, Spring `8082`. Both can run at once.

---

## 1. Architecture

```
api-spring/
├── pom.xml                      4 dependencies
├── Dockerfile                   maven build stage → JRE run stage
└── src/main/
    ├── resources/
    │   ├── application.properties
    │   └── openapi.yaml         served at /api/docs
    └── java/com/idol/api/
        ├── Application.java     main, bcrypt bean, CORS, static /uploads
        ├── RequestId.java       X-Request-Id in/out + one log line per request
        ├── RateLimiter.java     10/min per IP on the credential endpoints
        ├── Jwt.java             HS256 sign/verify, no library
        ├── ApiException.java    status + code
        ├── ErrorHandler.java    the error envelope
        ├── AuthController.java  sessions, lockout, password reset, permissions
        ├── ProductController.java  products, pagination, ETags, uploads
        ├── Idempotency.java     Idempotency-Key claim / replay
        ├── Audit.java           one row per successful mutation
        └── ItemController.java  items, health probes, /api/docs
```

**Implemented.** Eleven files, one package, no service layer, no repository
interfaces, no DTO classes. Controllers call `JdbcTemplate` directly and the SQL
is written where it runs.

**Why this practice.** The brief was the simplest thing that behaves like the Go
API. Layering pays for itself when there are several callers, several storage
backends, or a test suite that needs seams — none of which apply here.

**Trade-off.** There is nothing to unit-test in isolation, and a second caller
for any query means copying it. This is the wrong structure for a system that
has to grow, and it is chosen with that understood.

### Dependencies

| Dependency | Why |
| --- | --- |
| `spring-boot-starter-web` | HTTP |
| `spring-boot-starter-jdbc` | `JdbcTemplate` — SQL stays visible |
| `spring-security-crypto` | `BCryptPasswordEncoder` only |
| `postgresql` (runtime) | the driver |

No JWT library: `Jwt.java` is fifteen lines of `javax.crypto`. No JPA: entity
mapping would hide the queries this app is meant to show. No Swagger UI: the
contract is served as YAML instead of rendered.

---

## 2. Endpoints

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/livez` | — | process is up; does not touch the database |
| GET | `/readyz`, `/health` | — | database answers |
| GET | `/startupz` | — | 200 once booted, 503 before |
| GET | `/api/docs` | — | the OpenAPI document, as YAML |
| GET | `/api/items` | — | demonstration data |
| GET | `/uploads/{file}` | — | uploaded files |
| POST | `/api/auth/login` | — | rate limited 10/min/IP |
| POST | `/api/auth/refresh` | cookie | rotates the refresh token |
| POST | `/api/auth/logout` | — | revokes and clears |
| GET | `/api/auth/me` | Bearer | |
| POST | `/api/auth/forgot-password` | — | rate limited |
| POST | `/api/auth/reset-password` | — | rate limited |
| GET | `/api/products` | — | three pagination modes |
| GET | `/api/products/{id}` | — | ETag carries the version |
| POST | `/api/products` | Bearer + `products:create` | JSON or multipart; `Idempotency-Key` |
| PATCH | `/api/products/{id}` | Bearer + `products:update` | `If-Match` |
| DELETE | `/api/products/{id}` | Bearer + `products:delete` | `If-Match` |

**Implemented.** Reads are public, writes require a session. **Why this
practice:** this is showcase data and the grid has to render before anyone signs
in; gating reads would put a login in front of every public page.

---

## 3. Authentication

**Implemented.** Two token types:

- an **access token** — a signed JWT, 15 minutes, returned in the response body
  for the client to hold in memory;
- a **refresh token** — 32 random bytes, stored as a SHA-256 hash, delivered in
  an httpOnly `SameSite=Lax` cookie. Seven days, or thirty with `rememberMe`.

**Why this practice.** A JWT cannot be revoked before it expires, so it is given
a short life. The refresh token can be revoked, so it is the one that persists —
and `httpOnly` keeps it out of reach of any script on the page.

### The rules that are not simplifications

These are kept in full because dropping them would be a security defect, not a
smaller program:

| Rule | Where | Why |
| --- | --- | --- |
| bcrypt cost 12 | `Application.passwordEncoder` | the two APIs share a `users` table; a hash written by one must verify in the other |
| One message for "no account" and "wrong password" | `AuthController.invalidCredentials` | otherwise the login form tells strangers who has an account |
| A dummy bcrypt verify when no account matches | `AuthController.DUMMY_HASH` | equal timing; otherwise the response *duration* leaks the same fact |
| Refresh tokens stored hashed | `AuthController.sha256` | a database leak does not hand over live sessions |
| Rotation on every refresh | `AuthController.refresh` | a stolen refresh token dies at the next legitimate use |
| `alg` never read from the token | `Jwt.verify` | recomputing the signature is what rejects `{"alg":"none"}` |
| Constant-time signature compare | `MessageDigest.isEqual` | an early return leaks how much of a forgery was right |
| Five failures → 15-minute lock | `AuthController.login` | stops one account being ground down |
| 10 attempts/minute/IP | `RateLimiter` | stops one source spraying many accounts |
| Reset revokes every session | `AuthController.resetPassword` | whoever set the password gets the account |

**Trade-off.** The rate limiter is in memory, so it resets on restart and is
per-instance. The Go API has the same property. Anything better needs shared
state.

---

## 4. Products

### Pagination

**Implemented.** Three modes, chosen by `mode`:

| Mode | Use | Cost |
| --- | --- | --- |
| `offset` (default) | numbered pages | `OFFSET` scans and discards; page 500 pays for 12,475 rows |
| `keyset` | infinite scroll, exports | seeks straight to the cursor; flat at any depth |
| `all` | reference lists | no limit — filters still apply |

`withTotal=false` skips the `COUNT`. **`total` is then `null`, which is
deliberately different from `0`** — one means "not counted", the other means
"counted, and there are none".

Cursors are opaque base64 of `nanos|id`. **Why this practice:** the format can
change without breaking a saved link, and nobody can mistake the value for a row
id.

Keyset is only supported on the default ordering (`created_at DESC`). A cursor
is only meaningful against the sort it was produced for, so a different sort is
refused with `INVALID_CURSOR` rather than silently returning wrong rows.

Sorting is a whitelist mapping API names to columns (`productId` → `product_id`).
**Why this practice:** an identifier cannot be a bound parameter, so the only
safe `ORDER BY` is one the server chose.

### Optimistic concurrency

**Implemented.** Every product carries a `version`. `GET` returns it as an
`ETag`; `PATCH` and `DELETE` accept it as `If-Match` and fail with **412
VERSION_CONFLICT** if the row moved on. The version is incremented in the same
statement that writes the change, so a reader cannot see new data with an old
version.

Without `If-Match` the write proceeds unconditionally — the precondition is the
caller's choice, exactly as in the Go API.

### Idempotency

**Implemented.** `POST /api/products` honours `Idempotency-Key`:

| Situation | Answer |
| --- | --- |
| First use | a `processing` row is claimed, the handler runs, the response is stored |
| Same key, same body | the stored response is replayed (`Idempotent-Replay: true`) |
| Same key, different body | **409 IDEMPOTENCY_KEY_REUSED** |
| First attempt still running | **409 REQUEST_IN_PROGRESS** |
| Handler threw | the claim is released, so a corrected retry is not blocked |

The `INSERT` is the lock: the unique index on `(scope, idempotency_key)` means
two simultaneous retries cannot both claim it. Keys are scoped per user and
route — two users sending the same key are not making the same request.

### Uploads

**Implemented.** Multipart create stores files under a random UUID name and puts
the *path* in the database. **Why this practice:** a client-supplied filename can
contain `../` or a shell character, and a random name means none of it is ever
used as a path. Files are served publicly because an `<img>` tag cannot send an
`Authorization` header.

### Validation

**Implemented.** None in the application. Every rule — length, range, enum,
uniqueness, "shipping regions must not be empty", "terms must be accepted" — is a
`CHECK` or `UNIQUE` constraint in `db/init/003_products.sql`, and a violation is
translated into `VALIDATION_ERROR` (or `DUPLICATE_PRODUCT_ID`).

**Why this practice.** The database is the only place a rule is actually
enforced; a second copy in Java would be a second thing to keep in sync.

**Trade-off.** The messages are the database's, so they name constraints rather
than fields. The Go API validates in the handler as well and produces friendlier
messages.

---

## 5. Cross-cutting

**Request IDs.** `X-Request-Id` is honoured if supplied (capped at 64 chars) or
generated, echoed in the response header, and included in every error body. One
line per request is logged: method, path, status, duration, id.

**Why this practice.** A screenshot of an error is enough to find the request in
the log. **Trade-off:** that is the entire observability story — no structured
logs, no metrics, no tracing. The Go API has OpenTelemetry; this does not, and
that was the explicit instruction.

**Audit events.** Every successful mutation writes one row to `audit_events`:
actor, action, resource id, request id, IP, metadata. Written *after* the change
commits, and failures are swallowed. **Why:** an audit write that rolls back the
change it was recording is worse than none — the change happened, and the record
would say it did not.

**Errors.** One envelope everywhere:

```json
{"error": {"code": "VERSION_CONFLICT", "message": "…", "requestId": "…"}}
```

The codes are the Go API's verbatim, because the frontends switch on them:
`UNAUTHENTICATED`, `INVALID_CREDENTIALS`, `NO_SESSION`, `INVALID_REFRESH_TOKEN`,
`ACCOUNT_LOCKED`, `ACCOUNT_DISABLED`, `WEAK_PASSWORD`, `INVALID_RESET_TOKEN`,
`FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, `VALIDATION_FAILED`,
`INVALID_BODY`, `INVALID_CURSOR`, `INVALID_IF_MATCH`, `VERSION_CONFLICT`,
`DUPLICATE_PRODUCT_ID`, `IDEMPOTENCY_KEY_REUSED`, `REQUEST_IN_PROGRESS`,
`RATE_LIMITED`, `INTERNAL`.

**Permissions.** Route policy is expressed as capabilities, not role names:
`admin` holds `products:create|update|delete`, `user` holds none. 401 and 403 are
different answers — "who are you" versus "I know, and no".

---

## 6. Verified parity

Measured with both APIs running against the same database. Every row below was
checked side by side.

| Behaviour | Result |
| --- | --- |
| List item field names | identical sets, no difference either way |
| Offset paging, sort, `pageSize` cap (200) | identical |
| `withTotal=false` → `total: null` | identical |
| `mode=all` | identical |
| Keyset page 1 → cursor → page 2 | identical ids |
| Keyset on a non-default sort | both 400 `INVALID_CURSOR` |
| Malformed cursor | both 400 `INVALID_CURSOR` |
| Filters: category, tag, isPublished, condition, search | identical result sets |
| Login: wrong password vs unknown account | both 401 `INVALID_CREDENTIALS`, same message |
| Login with missing fields | both 422 `VALIDATION_FAILED` |
| `/api/auth/me` with no token | both 401 `UNAUTHENTICATED` |
| Refresh with no cookie | both 401 `NO_SESSION` |
| Create without a token | both 401 `UNAUTHENTICATED` |
| Create as the `user` role | both 403 `FORBIDDEN` |
| Create | both 201 with `ETag: "1"` |
| `PATCH` with correct `If-Match` | both 200, version 2, new ETag |
| `PATCH` with stale `If-Match` | both 412 `VERSION_CONFLICT` |
| `PATCH` with unparseable `If-Match` | both 400 `INVALID_IF_MATCH` |
| Idempotent retry | both 201 twice, same row |
| Key reused with a different body | both 409 `IDEMPOTENCY_KEY_REUSED` |
| Duplicate `productId` | both 409 `DUPLICATE_PRODUCT_ID` |
| `DELETE` with stale `If-Match` | both 412 `VERSION_CONFLICT` |
| `DELETE` | both 204 |
| Password reset end to end | works; the new hash then verifies in the Go API |
| Lockout: 5 failures | 6th attempt 429 `ACCOUNT_LOCKED`, even with the right password |

---

## 7. Differences that remain

Recorded rather than hidden. None is accidental.

| Difference | Detail |
| --- | --- |
| **No background worker** | The Go API runs a job queue and a maintenance sweep. This has neither, so expired refresh tokens, used reset tokens and stale idempotency records are never cleaned up. |
| **No OpenTelemetry** | One log line per request; no traces, no metrics. |
| **No tests** | The Go API has unit and integration tests. This has none — parity was verified by hand, and the results are in section 6. |
| **No request timeout** | The Go API bounds each request; here a slow query holds a thread. |
| **Decimal formatting** | After a `PATCH`, Go returns `"20"` where this returns `"20.00"` — Go's decimal type normalises trailing zeros. Both are valid decimal strings and the stored value is identical. |
| **`Idempotent-Replay` header** | Sent on a replayed response. The Go API does not send it. |
| **Multipart array fields** | Repeated keys are read as one comma-joined value and split, so a tag containing a comma is not representable. The Go API reads them as a list. |
| **Different signing keys** | Unless `AUTH_JWT_SECRET` is set in `.env`, each app falls back to its own development key, so a token from one is not accepted by the other. Set it to share sessions. |
| **Validation messages** | Constraint text from PostgreSQL rather than field-level messages. |
| **Swagger UI** | The contract is served as YAML at `/api/docs`; the Go API renders it. |

---

## 8. Operations

```bash
docker compose --profile spring up -d --build api-spring   # start
docker compose --profile spring logs -f api-spring         # follow
curl -s localhost:8082/health                              # readiness
```

The service is behind a compose **profile**, so ordinary `docker compose up`
does not start it.

It owns no schema and runs no migrations: `db/init/*.sql` and the Go API's
embedded migrations remain the single source of truth. This app only reads and
writes tables that already exist — which is also why it can run beside the Go
API without the two fighting over the schema.

**Known trap — JDBC connections.** Array columns are bound as a PostgreSQL
literal with a `::text[]` cast. Building them with
`dataSource.getConnection().createArrayOf(...)` takes a connection that is never
returned, because the array outlives the scope that would close it. That leak
emptied the ten-connection pool after a handful of writes and turned every later
request into a thirty-second timeout. Verified fixed: fifteen consecutive
array-writing creates all return 201 and reads still respond.

**Known trap — Docker networking.** The `backend` network is `internal: true`, and Docker silently
ignores a published port on a container attached only to an internal network.
The port mapping lives in `docker-compose.dev.yaml` and the service is attached
to `frontend` as well, exactly as the Go API is. A `ports:` entry that looks
correct and does nothing is the failure this avoids.
