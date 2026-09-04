// Package auth holds the credential and token primitives.
//
// Kept separate from the handlers so the security-critical parts — hashing,
// token generation, constant-time comparison — can be read and tested without
// any HTTP around them.
package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

var errInvalidAccessTokenClaims = errors.New("invalid access token claims")

// opaqueTokenBytes is 32 bytes = 256 bits of entropy, which is well past what
// is guessable and matches the SHA-256 used to store it.
const opaqueTokenBytes = 32

// NewOpaqueToken returns a URL-safe random token.
//
// Opaque rather than a JWT: refresh tokens must be revocable, and revoking a
// JWT means keeping a denylist — at which point the statelessness that made the
// JWT attractive is gone.
func NewOpaqueToken() (string, error) {
	buf := make([]byte, opaqueTokenBytes)
	if _, err := rand.Read(buf); err != nil {
		return "", fmt.Errorf("generate token: %w", err)
	}
	return base64.RawURLEncoding.EncodeToString(buf), nil
}

// HashToken returns the hex SHA-256 of a token.
//
// SHA-256, not bcrypt, and the difference matters. A password is low-entropy
// and needs a slow hash to survive brute force; a 256-bit random token is not
// brute-forceable, so the only requirement is that the stored value cannot be
// reversed. A slow hash here would just make every refresh slow.
func HashToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

// Claims is the access-token payload. Deliberately small: an access token is
// copied into every request, and anything in it is stale the moment it is
// signed.
type Claims struct {
	UserID uint64 `json:"uid"`
	Email  string `json:"email"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

// TokenIssuer signs and verifies access tokens.
type TokenIssuer struct {
	secret    []byte
	issuer    string
	accessTTL time.Duration
}

func NewTokenIssuer(secret []byte, issuer string, accessTTL time.Duration) *TokenIssuer {
	return &TokenIssuer{secret: secret, issuer: issuer, accessTTL: accessTTL}
}

func (t *TokenIssuer) AccessTTL() time.Duration { return t.accessTTL }

// Issue signs a short-lived access token.
func (t *TokenIssuer) Issue(userID uint64, email, role string, now time.Time) (string, error) {
	claims := Claims{
		UserID: userID,
		Email:  email,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    t.issuer,
			Subject:   fmt.Sprintf("%d", userID),
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(t.accessTTL)),
			NotBefore: jwt.NewNumericDate(now),
		},
	}
	signed, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(t.secret)
	if err != nil {
		return "", fmt.Errorf("sign access token: %w", err)
	}
	return signed, nil
}

// Verify parses and validates an access token.
//
// The algorithm is pinned with WithValidMethods. Without it a token signed with
// "alg": "none", or an HMAC token verified against an RSA public key, would be
// accepted — the classic JWT confusion attack.
func (t *TokenIssuer) Verify(token string) (*Claims, error) {
	parsed, err := jwt.ParseWithClaims(
		token,
		&Claims{},
		func(*jwt.Token) (any, error) { return t.secret, nil },
		jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}),
		jwt.WithIssuer(t.issuer),
		jwt.WithExpirationRequired(),
	)
	if err != nil {
		return nil, fmt.Errorf("verify access token: %w", err)
	}
	claims, ok := parsed.Claims.(*Claims)
	if !ok || !parsed.Valid {
		return nil, fmt.Errorf("verify access token: %w", errInvalidAccessTokenClaims)
	}
	return claims, nil
}
