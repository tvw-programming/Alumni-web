## Component Specification

### Name & Purpose
`apperror` + the error middleware — the single place a Go error becomes an HTTP
response. Guarantees every failure has a stable code, a safe message and a
request ID.

### Location
`api/internal/apperror/error.go`, `api/internal/middleware/error_handler.go`

### Public Interface

```go
type Error struct {
    Status  int    // HTTP status
    Code    string // stable machine-readable code, e.g. "INVALID_CREDENTIALS"
    Message string // safe to show a user
    Err     error  // wrapped cause, never sent to the client
}

func New(status int, code, message string, err error) *Error
func (e *Error) Error() string
func (e *Error) Unwrap() error

// middleware
func ErrorHandler(logger *slog.Logger) fiber.ErrorHandler
```

### Dependencies
- Internal: none.
- External: `log/slog` for structured logging; Fiber for the handler signature.

### Data Models

The wire shape of every failure:

```json
{ "error": { "code": "INVALID_CREDENTIALS",
             "message": "Email or password is incorrect.",
             "requestId": "194be76a-…" } }
```

### Business Rules & Constraints

- **Handlers return errors; they do not write error responses.** Returning
  `*apperror.Error` from a handler is the only sanctioned way to fail.
- **`Err` is logged, never serialized.** The wrapped cause routinely contains
  SQL text, table names and driver detail.
- **An unrecognised error becomes 500 `INTERNAL_ERROR`** with a generic message.
  A handler that leaks a raw error string is a bug.
- **Every response carries the request ID** from `middleware.RequestID()`, so a
  user-reported failure can be found in the logs.
- **Codes are stable API surface.** Clients switch on `code`, never on `message`
  — messages are wording and change.

### Extension Points

- **A new failure kind:** `apperror.New(status, "NEW_CODE", "…", cause)` at the
  call site. No registration.
- **Repository errors:** translate to `apperror` in the handler, not the
  repository — `repository.ErrNotFound` → 404, `ErrDuplicate` → 409.
- **A new response field:** edit `ErrorHandler`; every endpoint gains it at once.
