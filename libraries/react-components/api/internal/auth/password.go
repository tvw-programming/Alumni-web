package auth

import (
	"errors"
	"fmt"
	"unicode"

	"golang.org/x/crypto/bcrypt"
)

// bcryptCost 12 is roughly 250ms on current hardware — slow enough to make
// offline cracking expensive, fast enough that a login is not noticeably
// delayed. Raise it as hardware improves; existing hashes keep their own cost
// and are rehashed on next login by NeedsRehash.
const bcryptCost = 12

// MinPasswordLength is the one rule worth enforcing.
//
// Length dominates every composition rule for actual strength, and forcing
// symbols mostly produces "Password1!". NIST SP 800-63B recommends exactly
// this: a length floor, and no mandatory character classes.
const MinPasswordLength = 12

var (
	ErrPasswordTooShort = fmt.Errorf("password must be at least %d characters", MinPasswordLength)
	ErrPasswordTooLong  = errors.New("password must be at most 72 bytes")
	ErrPasswordWeak     = errors.New("password must not be a single repeated character")
)

// HashPassword returns a bcrypt verifier.
func HashPassword(password string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcryptCost)
	if err != nil {
		return "", fmt.Errorf("hash password: %w", err)
	}
	return string(hash), nil
}

// VerifyPassword reports whether the password matches the hash.
//
// bcrypt's own comparison is constant-time with respect to the hash, so this
// does not leak how much of the password was correct.
func VerifyPassword(hash, password string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) == nil
}

// NeedsRehash reports whether a stored hash was made with a weaker cost than
// the current one, so it can be upgraded transparently on next successful login.
func NeedsRehash(hash string) bool {
	cost, err := bcrypt.Cost([]byte(hash))
	if err != nil {
		// Unreadable hash: treat as needing replacement rather than trusting it.
		return true
	}
	return cost < bcryptCost
}

// ValidatePassword applies the policy.
//
// The 72-byte ceiling is not arbitrary: bcrypt silently truncates beyond it, so
// without this check two different long passwords could authenticate each other.
func ValidatePassword(password string) error {
	if len([]rune(password)) < MinPasswordLength {
		return ErrPasswordTooShort
	}
	if len(password) > 72 {
		return ErrPasswordTooLong
	}
	if isSingleRepeatedRune(password) {
		return ErrPasswordWeak
	}
	return nil
}

func isSingleRepeatedRune(s string) bool {
	var first rune
	for i, r := range s {
		if i == 0 {
			first = r
			continue
		}
		if r != first {
			return false
		}
	}
	return true
}

// NormalizeEmail lower-cases and trims. The column is CITEXT so comparison is
// already case-insensitive; this keeps what is *stored* predictable.
func NormalizeEmail(email string) string {
	out := make([]rune, 0, len(email))
	for _, r := range email {
		if unicode.IsSpace(r) {
			continue
		}
		out = append(out, unicode.ToLower(r))
	}
	return string(out)
}
