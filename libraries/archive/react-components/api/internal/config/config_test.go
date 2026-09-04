package config

import (
	"errors"
	"testing"
)

func validEnvironment(t *testing.T) {
	t.Helper()
	t.Setenv("DB_PASSWORD", "test-password")
	t.Setenv("APP_ENV", "development")
	t.Setenv("AUTH_JWT_SECRET", "")
}

func TestLoadRejectsInvalidDuration(t *testing.T) {
	validEnvironment(t)
	t.Setenv("REQUEST_TIMEOUT", "five seconds")

	_, err := Load()
	if !errors.Is(err, ErrNotPositiveDuration) {
		t.Fatalf("Load error = %v, want ErrNotPositiveDuration", err)
	}
}

func TestLoadRejectsNonPositiveDuration(t *testing.T) {
	validEnvironment(t)
	t.Setenv("AUTH_ACCESS_TTL", "0s")

	_, err := Load()
	if !errors.Is(err, ErrNotPositiveDuration) {
		t.Fatalf("Load error = %v, want ErrNotPositiveDuration", err)
	}
}

func TestLoadRejectsInvalidBoolean(t *testing.T) {
	validEnvironment(t)
	t.Setenv("AUTH_SECURE_COOKIES", "sometimes")

	_, err := Load()
	if !errors.Is(err, ErrNotBoolean) {
		t.Fatalf("Load error = %v, want ErrNotBoolean", err)
	}
}

func TestLoadIncludesBodyLimit(t *testing.T) {
	validEnvironment(t)
	t.Setenv("MAX_REQUEST_BODY_SIZE", "1048576")

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if cfg.MaxRequestBodySize != 1048576 {
		t.Fatalf("MaxRequestBodySize = %d, want 1048576", cfg.MaxRequestBodySize)
	}
}

func TestLoadRejectsUnknownEnvironment(t *testing.T) {
	validEnvironment(t)
	t.Setenv("APP_ENV", "prodution")

	_, err := Load()
	if !errors.Is(err, ErrInvalidEnvironment) {
		t.Fatalf("Load error = %v, want ErrInvalidEnvironment", err)
	}
}

func TestProductionRequiresSecureResetConfiguration(t *testing.T) {
	validEnvironment(t)
	t.Setenv("APP_ENV", "production")
	t.Setenv("AUTH_JWT_SECRET", "a-production-signing-secret-with-more-than-32-bytes")
	t.Setenv("AUTH_SECURE_COOKIES", "false")
	t.Setenv("AUTH_RESET_URL", "https://example.test/reset-password")

	_, err := Load()
	if !errors.Is(err, ErrSecureCookieRequired) {
		t.Fatalf("Load error = %v, want ErrSecureCookieRequired", err)
	}

	t.Setenv("AUTH_SECURE_COOKIES", "true")
	t.Setenv("AUTH_RESET_URL", "http://example.test/reset-password")
	_, err = Load()
	if !errors.Is(err, ErrHTTPSResetURL) {
		t.Fatalf("Load error = %v, want ErrHTTPSResetURL", err)
	}
}
