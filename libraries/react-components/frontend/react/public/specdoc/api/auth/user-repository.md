## Component Specification

### Name & Purpose

`UserRepository` — all database access for users, refresh tokens and password
reset tokens. The only place GORM appears for authentication.

### Location

`api/internal/repository/user_repository.go`

### Public Interface

```go
var ErrNotFound = errors.New("not found")

type UserRepository interface {
    FindByEmail(ctx, email string) (*model.User, error)
    FindByID(ctx, id uint64) (*model.User, error)
    UpdatePassword(ctx, userID uint64, passwordHash string) error
    RecordLoginSuccess(ctx, userID uint64, at time.Time) error
    RecordLoginFailure(ctx, userID uint64, lockUntil *time.Time) error

    CreateRefreshToken(ctx, token *model.RefreshToken) error
    FindRefreshToken(ctx, tokenHash string) (*model.RefreshToken, error)
    RevokeRefreshToken(ctx, tokenHash string, at time.Time) error
    RevokeAllRefreshTokens(ctx, userID uint64, at time.Time) error

    CreatePasswordResetToken(ctx, token *model.PasswordResetToken) error
    FindPasswordResetToken(ctx, tokenHash string) (*model.PasswordResetToken, error)
    MarkPasswordResetTokenUsed(ctx, id uint64, at time.Time) error
}

func NewUserRepository(db *gorm.DB) UserRepository
```

### Dependencies

- Internal: `model`.
- External: GORM.

### Data Models

`users`, `refresh_tokens`, `password_reset_tokens` — see
[`data/schema.md`](../data/schema.md).

```go
func (u *User) Locked(now time.Time) bool       { return u.LockedUntil != nil && u.LockedUntil.After(now) }
func (t *RefreshToken) Usable(now time.Time) bool { return t.RevokedAt == nil && t.ExpiresAt.After(now) }
```

### Business Rules & Constraints

- **`gorm.ErrRecordNotFound` is translated to `ErrNotFound`.** Callers must not
  import GORM to distinguish "no row" from "database down".
- **Failure counting is done in SQL**, not read-modify-write — a lost update is
  exactly what an attacker racing the endpoint would want:

```go
updates := map[string]any{"failed_login_attempts": gorm.Expr("failed_login_attempts + 1")}
```

- **`UpdatePassword` also clears the lockout.** The person proved control of the
  mailbox; leaving them locked out would be its own denial of service.
- **Revocation is idempotent** — `WHERE … AND revoked_at IS NULL`, so revoking
  twice is not an error and cannot overwrite the original timestamp.
- **Lookups are by `token_hash`, never by the token.** The raw token is never
  stored, so a database dump cannot be replayed.
- **`email` is `CITEXT`**, so `WHERE email = ?` is case-insensitive _and_ still
  uses the unique index. Do not wrap it in `LOWER()` — that defeats the index.

### Extension Points

- **A new user field:** add to `model.User` and the migration; add to the
  `Updates` map of whichever method owns it.
- **A sessions list ("sign out everywhere" UI):** add
  `ListRefreshTokens(ctx, userID)` — `user_agent`, `ip_address` and `created_at`
  are already recorded for it.
- **Token cleanup:** a `DeleteExpiredTokens` sweep; the partial index
  `refresh_tokens_active_idx` exists to support it.
