## Component Specification

### Name & Purpose
`middleware` — request ID, structured request logging, and panic recovery.
Applied to every route.

### Location
`api/internal/middleware/request.go`, `error_handler.go`

### Public Interface

```go
func RequestID() fiber.Handler
func RequestLogger(logger *slog.Logger) fiber.Handler
func Recover(logger *slog.Logger) fiber.Handler
func ErrorHandler(logger *slog.Logger) fiber.ErrorHandler
```

Registration order in `cmd/server/main.go` — it matters:

```go
app := fiber.New(fiber.Config{ ErrorHandler: appmiddleware.ErrorHandler(logger) })
app.Use(appmiddleware.RequestID())      // first: everything below logs the id
app.Use(appmiddleware.RequestLogger(logger))
app.Use(appmiddleware.Recover(logger))
```

### Dependencies
- Internal: `apperror` (the error handler renders it).
- External: `google/uuid` for request IDs; `log/slog`.

### Data Models
Emits one JSON log line per request:

```json
{"time":"…","level":"INFO","msg":"request completed",
 "request_id":"…","method":"POST","path":"/api/products",
 "status":201,"duration_ms":12}
```

### Business Rules & Constraints

- **`RequestID` runs first.** Middleware registered before it cannot log the ID,
  which is the one field that ties a user report to a log line.
- **An inbound `X-Request-ID` is honoured** so a trace survives the edge proxy;
  a missing one is generated.
- **`Recover` converts a panic into a 500** and logs the stack. A panic must not
  take the process down — one bad request would otherwise drop every in-flight
  connection.
- **The logger never logs request bodies.** They contain passwords.

### Extension Points

- **New cross-cutting behaviour** (metrics, tracing, CORS): a new `fiber.Handler`
  in this package, registered in `main.go` after `RequestID`.
- **Per-route middleware** (auth, rate limiting) is *not* here — it is applied at
  the route, see [`auth/auth-middleware.md`](../auth/auth-middleware.md).
