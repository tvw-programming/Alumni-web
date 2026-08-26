## Component Specification

### Name & Purpose

`auth` token and password primitives — hashing, random token generation, and JWT
signing/verification. Kept free of HTTP so the security-critical parts can be
read and tested in isolation.

### Location

`api/internal/auth/token.go`, `api/internal/auth/password.go`

### Public Interface

```go
// token.go
func NewOpaqueToken() (string, error)   // 32 random bytes, base64url
func HashToken(token string) string     // hex SHA-256

type Claims struct {
    UserID uint64 `json:"uid"`
    Email  string `json:"email"`
    Role   string `json:"role"`
    jwt.RegisteredClaims
}

type TokenIssuer struct{ /* unexported */ }
func NewTokenIssuer(secret []byte, issuer string, accessTTL time.Duration) *TokenIssuer
func (t *TokenIssuer) AccessTTL() time.Duration
func (t *TokenIssuer) Issue(userID uint64, email, role string, now time.Time) (string, error)
func (t *TokenIssuer) Verify(token string) (*Claims, error)

// password.go
const MinPasswordLength = 12
func HashPassword(password string) (string, error)
func VerifyPassword(hash, password string) bool
func NeedsRehash(hash string) bool
func ValidatePassword(password string) error
func NormalizeEmail(email string) string

var (
    ErrPasswordTooShort = fmt.Errorf("password must be at least %d characters", MinPasswordLength)
    ErrPasswordTooLong  = errors.New("password must be at most 72 bytes")
    ErrPasswordWeak     = errors.New("password must not be a single repeated character")
)
```

### Dependencies

- Internal: none.
- External: `golang-jwt/jwt/v5` (access tokens), `golang.org/x/crypto/bcrypt`
  (password verifiers).

### Data Models

Owns no persisted entity. Produces the access-token payload:

```json
{ "uid": 1, "email": "admin@…", "role": "admin",
  "iss": "idol-promo", "sub": "1", "exp": …, "nbf": …, "iat": … }
```

### Business Rules & Constraints

**Two hash algorithms, deliberately:**

| Value        | Algorithm       | Why                                                                                                                       |
| ------------ | --------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Password     | bcrypt, cost 12 | low-entropy, needs a _slow_ hash to survive offline cracking                                                              |
| Opaque token | SHA-256         | 256 bits of entropy is not brute-forceable; only irreversibility is needed, and a slow hash would make every refresh slow |

- **The JWT algorithm is pinned** with `jwt.WithValidMethods([]string{HS256})`.
  Without it, a token signed `"alg":"none"` is accepted — the classic JWT
  confusion attack. There is a test that fails if this pin is removed.
- **Issuer and expiry are required** on verification (`WithIssuer`,
  `WithExpirationRequired`).
- **Refresh tokens are opaque, not JWTs**, because they must be revocable — and
  revoking a JWT means keeping a denylist, at which point its statelessness is
  gone.
- **Password policy is a length floor only** (12 characters), per NIST SP
  800-63B. Mandatory character classes mostly produce `Password1!`.
- **The 72-byte ceiling is not arbitrary:** bcrypt silently truncates beyond it,
  so without the check two different long passwords could authenticate each other.
- **`NeedsRehash`** lets a stored hash be upgraded to the current cost on the one
  occasion the plaintext is available — a successful login.
- **bcrypt's comparison is constant-time** with respect to the hash, so
  `VerifyPassword` does not leak how much of the password was correct.

### Extension Points

- **Raising the bcrypt cost:** change `bcryptCost`; existing hashes keep their
  own cost and are upgraded on next login by `NeedsRehash`.
- **Changing the password policy:** `ValidatePassword` only. Both the reset
  endpoint and any future change-password endpoint go through it.
- **A second token audience** (e.g. an API key): a new `TokenIssuer` with its own
  issuer string — `Verify` rejects tokens from another issuer.

Covered by `api/internal/auth/auth_test.go` (10 tests), including `alg:none`,
wrong-key, wrong-issuer and expiry rejection.
