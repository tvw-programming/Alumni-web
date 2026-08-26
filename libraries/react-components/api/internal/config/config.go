package config

import (
	"errors"
	"fmt"
	"net/url"
	"os"
	"strconv"
	"time"
)

// Static sentinels so callers can match with errors.Is instead of comparing
// message strings.
var (
	ErrPasswordRequired     = errors.New("DB_PASSWORD is required")
	ErrIdleExceedsOpen      = errors.New("DB_MAX_IDLE_CONNS cannot exceed DB_MAX_OPEN_CONNS")
	ErrNotPositiveInteger   = errors.New("must be a positive integer")
	ErrNotPositiveDuration  = errors.New("must be a positive duration")
	ErrNotBoolean           = errors.New("must be true or false")
	ErrInvalidEnvironment   = errors.New("APP_ENV must be development, test, or production")
	ErrSecureCookieRequired = errors.New("AUTH_SECURE_COOKIES must be true in production")
	ErrHTTPSResetURL        = errors.New("AUTH_RESET_URL must be an absolute HTTPS URL in production")
)

type Config struct {
	ListenAddress      string
	RequestTimeout     time.Duration
	MaxRequestBodySize int
	Database           DatabaseConfig
	Auth               AuthConfig
	Uploads            UploadConfig
	Observability      ObservabilityConfig
	Background         BackgroundConfig
}

type BackgroundConfig struct {
	Enabled             bool
	PollInterval        time.Duration
	JobTimeout          time.Duration
	MaintenanceInterval time.Duration
}

type ObservabilityConfig struct {
	Enabled     bool
	ServiceName string
}

type UploadConfig struct {
	// Root is where uploaded files are written. A volume in Docker, so the
	// files survive a container replacement.
	Root string
	// PublicURL is the path prefix the API returns to clients. Kept separate
	// from Root so storage can move without changing any stored value.
	PublicURL string
}

type AuthConfig struct {
	// JWTSecret signs access tokens. Required in production; see Load.
	JWTSecret []byte
	Issuer    string
	// AccessTokenTTL is short by design: the role inside the token is a
	// snapshot, and this is how long a revoked user keeps their access.
	AccessTokenTTL time.Duration
	// SessionTTL applies without "remember me" — the cookie is also
	// session-scoped, so this is just the server-side ceiling.
	SessionTTL time.Duration
	// RememberMeTTL is the "remember me for a month" lifetime.
	RememberMeTTL time.Duration
	// SecureCookies must be true anywhere served over HTTPS.
	SecureCookies bool
	// ResetURLBase is the frontend page a reset link points at.
	ResetURLBase string
	// DevMode relaxes two things and nothing else: a generated JWT secret is
	// allowed, and the forgot-password response includes the reset link.
	DevMode bool
}

// ErrJWTSecretRequired is returned when a production build has no signing key.
// Generating one per process would silently invalidate every session on restart
// and break horizontal scaling, so it is a hard failure instead.
var ErrJWTSecretRequired = errors.New("AUTH_JWT_SECRET is required when APP_ENV=production")

// ErrJWTSecretTooShort guards against a key with less entropy than the HMAC it
// keys. 32 bytes matches HS256's output size.
var ErrJWTSecretTooShort = errors.New("AUTH_JWT_SECRET must be at least 32 bytes")

type DatabaseConfig struct {
	Host            string
	Port            int
	Name            string
	User            string
	Password        string
	SSLMode         string
	MaxOpenConns    int
	MaxIdleConns    int
	ConnMaxLifetime time.Duration
}

func Load() (Config, error) {
	dbPort, err := envInt("DB_PORT", 5432)
	if err != nil {
		return Config{}, err
	}
	maxOpen, err := envInt("DB_MAX_OPEN_CONNS", 10)
	if err != nil {
		return Config{}, err
	}
	maxIdle, err := envInt("DB_MAX_IDLE_CONNS", 5)
	if err != nil {
		return Config{}, err
	}
	requestTimeout, err := envDuration("REQUEST_TIMEOUT", 5*time.Second)
	if err != nil {
		return Config{}, err
	}
	connectionLifetime, err := envDuration("DB_CONN_MAX_LIFETIME", 30*time.Minute)
	if err != nil {
		return Config{}, err
	}
	maxRequestBodySize, err := envInt("MAX_REQUEST_BODY_SIZE", 32<<20)
	if err != nil {
		return Config{}, err
	}

	authCfg, err := loadAuth()
	if err != nil {
		return Config{}, err
	}
	telemetryEnabled, err := envBool("OTEL_ENABLED", false)
	if err != nil {
		return Config{}, err
	}
	backgroundEnabled, err := envBool("BACKGROUND_JOBS_ENABLED", true)
	if err != nil {
		return Config{}, err
	}
	backgroundPollInterval, err := envDuration("BACKGROUND_JOB_POLL_INTERVAL", time.Second)
	if err != nil {
		return Config{}, err
	}
	backgroundJobTimeout, err := envDuration("BACKGROUND_JOB_TIMEOUT", 30*time.Second)
	if err != nil {
		return Config{}, err
	}
	maintenanceInterval, err := envDuration("BACKGROUND_MAINTENANCE_INTERVAL", time.Hour)
	if err != nil {
		return Config{}, err
	}

	cfg := Config{
		Auth: authCfg,
		Observability: ObservabilityConfig{
			Enabled:     telemetryEnabled,
			ServiceName: env("OTEL_SERVICE_NAME", "idol-promo-api"),
		},
		Background: BackgroundConfig{
			Enabled:             backgroundEnabled,
			PollInterval:        backgroundPollInterval,
			JobTimeout:          backgroundJobTimeout,
			MaintenanceInterval: maintenanceInterval,
		},
		Uploads: UploadConfig{
			Root:      env("UPLOAD_ROOT", "/var/lib/idol-promo/uploads"),
			PublicURL: env("UPLOAD_PUBLIC_URL", "/api/uploads"),
		},
		ListenAddress:      env("LISTEN_ADDRESS", ":8080"),
		RequestTimeout:     requestTimeout,
		MaxRequestBodySize: maxRequestBodySize,
		Database: DatabaseConfig{
			Host:            env("DB_HOST", "localhost"),
			Port:            dbPort,
			Name:            env("DB_NAME", "items_app"),
			User:            env("DB_USER", "items_user"),
			Password:        os.Getenv("DB_PASSWORD"),
			SSLMode:         env("DB_SSLMODE", "disable"),
			MaxOpenConns:    maxOpen,
			MaxIdleConns:    maxIdle,
			ConnMaxLifetime: connectionLifetime,
		},
	}

	if cfg.Database.Password == "" {
		return Config{}, ErrPasswordRequired
	}
	if cfg.Database.MaxIdleConns > cfg.Database.MaxOpenConns {
		return Config{}, ErrIdleExceedsOpen
	}
	return cfg, nil
}

func env(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func envInt(key string, fallback int) (int, error) {
	value := os.Getenv(key)
	if value == "" {
		return fallback, nil
	}
	parsed, err := strconv.Atoi(value)
	if err != nil || parsed < 1 {
		return 0, fmt.Errorf("%s: %w", key, ErrNotPositiveInteger)
	}
	return parsed, nil
}

func envDuration(key string, fallback time.Duration) (time.Duration, error) {
	value := os.Getenv(key)
	if value == "" {
		return fallback, nil
	}
	parsed, err := time.ParseDuration(value)
	if err != nil || parsed <= 0 {
		return 0, fmt.Errorf("%s: %w", key, ErrNotPositiveDuration)
	}
	return parsed, nil
}

func loadAuth() (AuthConfig, error) {
	appEnvironment := env("APP_ENV", "development")
	if appEnvironment != "development" && appEnvironment != "test" && appEnvironment != "production" {
		return AuthConfig{}, ErrInvalidEnvironment
	}
	devMode := appEnvironment != "production"

	secret := os.Getenv("AUTH_JWT_SECRET")
	switch {
	case secret == "" && !devMode:
		return AuthConfig{}, ErrJWTSecretRequired
	case secret == "":
		// Development only. Stable across restarts so a reload does not sign
		// every developer out mid-task.
		// #nosec G101 -- guarded by the non-production environment branch.
		secret = "dev-only-insecure-signing-key-not-for-production-use"
	case len(secret) < 32:
		return AuthConfig{}, ErrJWTSecretTooShort
	}

	accessTTL, err := envDuration("AUTH_ACCESS_TTL", 15*time.Minute)
	if err != nil {
		return AuthConfig{}, err
	}
	sessionTTL, err := envDuration("AUTH_SESSION_TTL", 24*time.Hour)
	if err != nil {
		return AuthConfig{}, err
	}
	rememberTTL, err := envDuration("AUTH_REMEMBER_TTL", 30*24*time.Hour)
	if err != nil {
		return AuthConfig{}, err
	}
	secureCookies, err := envBool("AUTH_SECURE_COOKIES", !devMode)
	if err != nil {
		return AuthConfig{}, err
	}

	resetURL := env("AUTH_RESET_URL", "http://localhost:8090/reset-password")
	if !devMode {
		if !secureCookies {
			return AuthConfig{}, ErrSecureCookieRequired
		}
		parsedResetURL, parseErr := url.Parse(resetURL)
		if parseErr != nil || parsedResetURL.Scheme != "https" || parsedResetURL.Host == "" {
			return AuthConfig{}, ErrHTTPSResetURL
		}
	}

	return AuthConfig{
		JWTSecret:      []byte(secret),
		Issuer:         env("AUTH_ISSUER", "idol-promo"),
		AccessTokenTTL: accessTTL,
		SessionTTL:     sessionTTL,
		RememberMeTTL:  rememberTTL,
		SecureCookies:  secureCookies,
		ResetURLBase:   resetURL,
		DevMode:        devMode,
	}, nil
}

func envBool(key string, fallback bool) (bool, error) {
	value := os.Getenv(key)
	if value == "" {
		return fallback, nil
	}
	parsed, err := strconv.ParseBool(value)
	if err != nil {
		return false, fmt.Errorf("%s: %w", key, ErrNotBoolean)
	}
	return parsed, nil
}
