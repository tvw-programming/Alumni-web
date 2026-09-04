## Component Specification

### Name & Purpose

`config` — reads all environment configuration once at startup and fails fast on
anything invalid, so no other package reads `os.Getenv`.

### Location

`api/internal/config/config.go`

### Public Interface

```go
func Load() (Config, error)

type Config struct {
    ListenAddress  string
    RequestTimeout time.Duration
    Database       DatabaseConfig
    Auth           AuthConfig
    Uploads        UploadConfig
}

type AuthConfig struct {
    JWTSecret      []byte
    Issuer         string
    AccessTokenTTL time.Duration
    SessionTTL     time.Duration
    RememberMeTTL  time.Duration
    SecureCookies  bool
    ResetURLBase   string
    DevMode        bool
}

type UploadConfig struct {
    Root      string // filesystem path
    PublicURL string // path prefix returned to clients
}

var (
    ErrPasswordRequired    = errors.New("DB_PASSWORD is required")
    ErrIdleExceedsOpen     = errors.New("DB_MAX_IDLE_CONNS cannot exceed DB_MAX_OPEN_CONNS")
    ErrNotPositiveInteger  = errors.New("must be a positive integer")
    ErrJWTSecretRequired   = errors.New("AUTH_JWT_SECRET is required when APP_ENV=production")
    ErrJWTSecretTooShort   = errors.New("AUTH_JWT_SECRET must be at least 32 bytes")
)
```

### Dependencies

- Internal: none.
- External: standard library only.

### Data Models

| Variable                                  | Default                                | Notes                                   |
| ----------------------------------------- | -------------------------------------- | --------------------------------------- |
| `LISTEN_ADDRESS`                          | `:8080`                                |                                         |
| `REQUEST_TIMEOUT`                         | `5s`                                   | applied to every request-scoped context |
| `DB_PASSWORD`                             | —                                      | **required**, no default                |
| `DB_MAX_OPEN_CONNS` / `DB_MAX_IDLE_CONNS` | 10 / 5                                 | idle may not exceed open                |
| `APP_ENV`                                 | `development`                          | anything but `production` is dev mode   |
| `AUTH_JWT_SECRET`                         | dev-only built-in                      | **required** in production, ≥32 bytes   |
| `AUTH_ACCESS_TTL`                         | `15m`                                  | how long a revoked user keeps access    |
| `AUTH_SESSION_TTL`                        | `24h`                                  | without "remember me"                   |
| `AUTH_REMEMBER_TTL`                       | `720h`                                 | "remember me for a month"               |
| `AUTH_SECURE_COOKIES`                     | `true` outside development             |                                         |
| `AUTH_RESET_URL`                          | `http://localhost:8090/reset-password` |                                         |
| `UPLOAD_ROOT`                             | `/var/lib/idol-promo/uploads`          |                                         |
| `UPLOAD_PUBLIC_URL`                       | `/api/uploads`                         |                                         |

### Business Rules & Constraints

- **A production build with no `AUTH_JWT_SECRET` refuses to start.** Generating
  one per process would invalidate every session on restart and break horizontal
  scaling, so it is a hard failure rather than a silent default.
- **A supplied secret shorter than 32 bytes is rejected** — that is HS256's
  output size, and a shorter key has less entropy than the HMAC it keys.
- **`DevMode` relaxes exactly two things**: the built-in signing key is
  permitted, and `POST /api/auth/forgot-password` includes the reset link in its
  response. Nothing else branches on it.
- **`Root` and `PublicURL` are separate** so storage can move without rewriting
  any stored path.

### Extension Points

- **A new setting:** add a field, read it in `Load` via `env`/`envInt`/
  `envDuration`, give it a default. Validate here if invalid values should stop
  startup.
- **A new required-in-production setting:** follow the `ErrJWTSecretRequired`
  pattern — a sentinel error and a branch on `devMode`.
