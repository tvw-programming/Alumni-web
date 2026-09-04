## Component Specification

### Name & Purpose
`RequireAuth` / `RequireRole` — route guards that verify the access token and the
caller's role. The server-side half of authorization.

### Location
`api/internal/handler/auth_middleware.go`

### Public Interface

```go
func RequireAuth(tokens *auth.TokenIssuer) fiber.Handler
func RequireRole(roles ...string) fiber.Handler
func ClaimsFrom(c *fiber.Ctx) (*auth.Claims, bool)
```

Usage — order matters, `RequireRole` reads what `RequireAuth` placed:

```go
products.Post("/",       handler.RequireAuth(tokenIssuer), productHandler.Create)
products.Delete("/:id",  handler.RequireAuth(tokenIssuer),
                         handler.RequireRole("admin"), productHandler.Delete)
```

### Dependencies
- Internal: `auth.TokenIssuer`, `apperror`.
- External: Fiber.

### Data Models
Places `*auth.Claims` in `c.Locals("auth.claims")`. Read it with `ClaimsFrom`,
never by key.

### Business Rules & Constraints

- **The scheme match is case-insensitive** (`strings.EqualFold(header[:7],
  "bearer ")`) — the RFC says the scheme is not case-sensitive and some clients
  send `bearer`.
- **A missing or malformed header is 401 `UNAUTHENTICATED`**, never 403. 403
  means "authenticated but not permitted".
- **`RequireRole` reads the role from the verified token**, so it is only as
  fresh as the access token's lifetime — which is why that lifetime is 15
  minutes, not days.
- **`RequireRole` without `RequireAuth` before it always denies**, because no
  claims are present. This is fail-closed and intended.

**Which routes are gated today** — state this accurately, it is easy to overclaim:

| Route | Guard |
| --- | --- |
| `GET /api/products`, `GET /api/products/:id` | **none** — the grid renders without a session |
| `POST /api/products`, `PATCH /api/products/:id` | `RequireAuth` |
| `DELETE /api/products/:id` | `RequireAuth` + `RequireRole("admin")` |
| `GET /api/auth/me` | `RequireAuth` |
| `GET /api/items` | **none** — the public Team page reads it |

### Extension Points

- **Gating a new route:** add `RequireAuth(tokenIssuer)` before its handler.
- **A capability model** (instead of roles): add `RequireCapability` here reading
  the same claims. The frontends already model capabilities; the server does not
  yet.
- **Reading the caller in a handler:** `ClaimsFrom(c)`, then load the user by ID
  if fresh data is needed.
