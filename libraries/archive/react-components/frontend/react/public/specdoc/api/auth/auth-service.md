## Component Specification

### Name & Purpose

`auth.Service` — the authentication workflow: credential verification, session
issue and rotation, lockout, and password reset. Holds every rule that is not
about HTTP.

### Location

`api/internal/auth/service.go`

### Public Interface

```go
const (
    MaxFailedAttempts = 5
    LockoutDuration   = 15 * time.Minute
    ResetTokenTTL     = time.Hour
)

type Session struct {
    User         *model.User
    AccessToken  string
    RefreshToken string
    ExpiresIn    int
    RefreshTTL   time.Duration
}

type LoginInput struct {
    Email, Password       string
    RememberMe            bool
    UserAgent, IPAddress  string
}

func NewService(users repository.UserRepository, tokens *TokenIssuer,
                sessionTTL, rememberTTL time.Duration) *Service

func (s *Service) Login(ctx, in LoginInput) (*Session, error)
func (s *Service) Refresh(ctx, refreshToken, userAgent, ip string) (*Session, error)
func (s *Service) Logout(ctx, refreshToken string, allDevices bool) error
func (s *Service) RequestPasswordReset(ctx, email string) (string, *model.User, error)
func (s *Service) ResetPassword(ctx, token, newPassword string) error
func (s *Service) UserByID(ctx, id uint64) (*model.User, error)
```

### Dependencies

- Internal: `repository.UserRepository`, `TokenIssuer`, password primitives,
  `apperror`, `model`.
- External: none directly.

### Data Models

Reads and writes `users`, `refresh_tokens`, `password_reset_tokens` — see
[`data/schema.md`](../data/schema.md).

### Business Rules & Constraints

**No account enumeration.** Every credential failure returns one error:

```go
var errInvalidCredentials = apperror.New(
    http.StatusUnauthorized, "INVALID_CREDENTIALS",
    "Email or password is incorrect.", nil)
```

A _missing_ account additionally runs a dummy bcrypt verify, so the response
**time** matches too:

```go
if errors.Is(err, repository.ErrNotFound) {
    _ = VerifyPassword("$2a$12$……", in.Password) // equalise timing
    return nil, errInvalidCredentials
}
```

**Lockout.** 5 failures → 15 minutes. The counter lives on the user row, not in
memory, so a restart or a second replica cannot reset an attacker's budget. It is
incremented in SQL (`failed_login_attempts + 1`), not read-modify-write, so two
concurrent attempts both count.

**Refresh rotation with breach response.** Every refresh spends the presented
token and issues a new one. Presenting a token that was already revoked revokes
_every_ session for that user:

```go
if !stored.Usable(now) {
    if stored.RevokedAt != nil {
        _ = s.users.RevokeAllRefreshTokens(ctx, stored.UserID, now) // replay ⇒ leaked
    }
    return nil, apperror.New(401, "INVALID_REFRESH_TOKEN", "…", nil)
}
```

**Refresh preserves the original lifetime.** A browser-session login must not be
silently upgraded to 30 days:

```go
remember := stored.ExpiresAt.Sub(stored.CreatedAt) > s.sessionTTL
```

**`RequestPasswordReset` returns no error for an unknown email.** The endpoint
must answer identically either way or it becomes the enumeration oracle that
`Login` refuses to be.

**A completed reset revokes every session.** A password reset is the standard
response to "my account is compromised"; leaving sessions alive would achieve
nothing against someone already signed in.

**Hash upgrade on login.** If `NeedsRehash`, the password is rehashed at the
current cost — the only moment the plaintext is available.

### Extension Points

- **A new sign-in method** (OAuth, magic link): a new method that ends in
  `issueSession`, which is the single place a session is minted.
- **Changing lockout policy:** the three constants at the top.
- **Email delivery:** `RequestPasswordReset` _returns_ the token rather than
  sending it, so a mailer is wired at the handler layer without touching this file.
