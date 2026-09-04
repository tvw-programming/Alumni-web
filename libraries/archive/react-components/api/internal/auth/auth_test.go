package auth

import (
	"errors"
	"strings"
	"testing"
	"time"
)

func TestHashPasswordRoundTrips(t *testing.T) {
	const pw = "correct horse battery staple"
	hash, err := HashPassword(pw)
	if err != nil {
		t.Fatalf("hash: %v", err)
	}
	if hash == pw {
		t.Fatal("hash equals the plaintext")
	}
	if !VerifyPassword(hash, pw) {
		t.Error("correct password rejected")
	}
	if VerifyPassword(hash, pw+"x") {
		t.Error("wrong password accepted")
	}
}

func TestHashPasswordIsSalted(t *testing.T) {
	// Two hashes of the same password must differ, or the table is a rainbow
	// table waiting to happen.
	a, _ := HashPassword("same password twice")
	b, _ := HashPassword("same password twice")
	if a == b {
		t.Error("identical hashes: bcrypt salt is not being applied")
	}
}

func TestValidatePassword(t *testing.T) {
	cases := []struct {
		name     string
		password string
		wantErr  error
	}{
		{"too short", "short", ErrPasswordTooShort},
		{"exactly at the floor", strings.Repeat("ab", 6), nil},
		{"long and fine", "a reasonably long passphrase", nil},
		// bcrypt silently truncates past 72 bytes, so without this rule two
		// different long passwords could authenticate each other.
		{"beyond bcrypt's ceiling", strings.Repeat("x", 73), ErrPasswordTooLong},
		{"single repeated rune", strings.Repeat("a", 20), ErrPasswordWeak},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := ValidatePassword(tc.password); !errors.Is(got, tc.wantErr) {
				t.Errorf("got %v, want %v", got, tc.wantErr)
			}
		})
	}
}

func TestNormalizeEmail(t *testing.T) {
	for _, tc := range []struct{ in, want string }{
		{"  Ada@Example.COM ", "ada@example.com"},
		{"already@lower.test", "already@lower.test"},
	} {
		if got := NormalizeEmail(tc.in); got != tc.want {
			t.Errorf("NormalizeEmail(%q) = %q, want %q", tc.in, got, tc.want)
		}
	}
}

func TestOpaqueTokensAreUniqueAndHashStably(t *testing.T) {
	seen := make(map[string]struct{}, 100)
	for range 100 {
		token, err := NewOpaqueToken()
		if err != nil {
			t.Fatalf("generate: %v", err)
		}
		if _, dup := seen[token]; dup {
			t.Fatal("duplicate token generated")
		}
		seen[token] = struct{}{}

		tokenCopy := string([]byte(token))
		if HashToken(token) != HashToken(tokenCopy) {
			t.Fatal("hash is not stable")
		}
		if strings.Contains(HashToken(token), token) {
			t.Fatal("hash contains the token")
		}
	}
}

func newIssuer() *TokenIssuer {
	return NewTokenIssuer([]byte(strings.Repeat("k", 32)), "test-issuer", time.Minute)
}

func TestAccessTokenRoundTrips(t *testing.T) {
	issuer := newIssuer()
	token, err := issuer.Issue(42, "ada@example.test", "admin", time.Now())
	if err != nil {
		t.Fatalf("issue: %v", err)
	}
	claims, err := issuer.Verify(token)
	if err != nil {
		t.Fatalf("verify: %v", err)
	}
	if claims.UserID != 42 || claims.Role != "admin" {
		t.Errorf("claims round-tripped wrong: %+v", claims)
	}
}

func TestExpiredAccessTokenIsRejected(t *testing.T) {
	issuer := newIssuer()
	token, _ := issuer.Issue(1, "a@b.test", "user", time.Now().Add(-2*time.Minute))
	if _, err := issuer.Verify(token); err == nil {
		t.Error("expired token accepted")
	}
}

func TestTokenSignedWithAnotherKeyIsRejected(t *testing.T) {
	other := NewTokenIssuer([]byte(strings.Repeat("z", 32)), "test-issuer", time.Minute)
	token, _ := other.Issue(1, "a@b.test", "admin", time.Now())
	if _, err := newIssuer().Verify(token); err == nil {
		t.Error("token from a different key accepted")
	}
}

func TestUnsignedTokenIsRejected(t *testing.T) {
	// The `alg: none` attack. `WithValidMethods` is what stops it; this test
	// fails if that pin is ever removed.
	const noneToken = "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0." +
		"eyJ1aWQiOjEsInJvbGUiOiJhZG1pbiIsImlzcyI6InRlc3QtaXNzdWVyIiwiZXhwIjo0MTAyNDQ0ODAwfQ."
	if _, err := newIssuer().Verify(noneToken); err == nil {
		t.Error("unsigned token accepted")
	}
}

func TestTokenFromAnotherIssuerIsRejected(t *testing.T) {
	other := NewTokenIssuer([]byte(strings.Repeat("k", 32)), "someone-else", time.Minute)
	token, _ := other.Issue(1, "a@b.test", "admin", time.Now())
	if _, err := newIssuer().Verify(token); err == nil {
		t.Error("token from another issuer accepted")
	}
}
