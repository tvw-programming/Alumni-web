package auth

import (
	"context"
	"errors"
	"net/http"
	"time"

	"github.com/example/idol-promo/api/internal/apperror"
	"github.com/example/idol-promo/api/internal/model"
	"github.com/example/idol-promo/api/internal/repository"
)

// Lockout policy. Five attempts then a 15-minute freeze: enough to absorb a
// forgotten password, short enough that a locked-out user is not stuck for long,
// and slow enough that online guessing is hopeless.
const (
	MaxFailedAttempts = 5
	LockoutDuration   = 15 * time.Minute
	ResetTokenTTL     = time.Hour
)

// One message for every credential failure. Distinguishing "no such user" from
// "wrong password" turns the login form into an account-enumeration oracle.
var errInvalidCredentials = apperror.New(
	http.StatusUnauthorized, "INVALID_CREDENTIALS", "Email or password is incorrect.", nil)

type Session struct {
	User         *model.User
	AccessToken  string
	RefreshToken string
	ExpiresIn    int
	RefreshTTL   time.Duration
}

type LoginInput struct {
	Email      string
	Password   string
	RememberMe bool
	UserAgent  string
	IPAddress  string
}

type Service struct {
	users       repository.UserRepository
	tokens      *TokenIssuer
	sessionTTL  time.Duration
	rememberTTL time.Duration
	now         func() time.Time
}

func NewService(
	users repository.UserRepository,
	tokens *TokenIssuer,
	sessionTTL, rememberTTL time.Duration,
) *Service {
	return &Service{
		users:       users,
		tokens:      tokens,
		sessionTTL:  sessionTTL,
		rememberTTL: rememberTTL,
		now:         time.Now,
	}
}

// Login verifies credentials and issues a session.
func (s *Service) Login(ctx context.Context, in LoginInput) (*Session, error) {
	now := s.now()
	email := NormalizeEmail(in.Email)

	user, err := s.users.FindByEmail(ctx, email)
	if errors.Is(err, repository.ErrNotFound) {
		// Hash a dummy password anyway so a missing account takes the same time
		// as a wrong password. Without this the response time alone reveals
		// which emails are registered.
		_ = VerifyPassword("$2a$12$........................................................", in.Password)
		return nil, errInvalidCredentials
	}
	if err != nil {
		return nil, err
	}

	if !user.IsActive {
		return nil, apperror.New(http.StatusForbidden, "ACCOUNT_DISABLED",
			"This account has been disabled.", nil)
	}
	if user.Locked(now) {
		return nil, apperror.New(http.StatusTooManyRequests, "ACCOUNT_LOCKED",
			"Too many failed attempts. Try again later.", nil)
	}

	if !VerifyPassword(user.PasswordHash, in.Password) {
		if err := s.users.RecordLoginFailure(
			ctx, user.ID, MaxFailedAttempts, now.Add(LockoutDuration)); err != nil {
			return nil, err
		}
		return nil, errInvalidCredentials
	}

	// Correct password, so the stored hash can be upgraded to the current cost
	// while it is in hand — the only moment the plaintext is available.
	if NeedsRehash(user.PasswordHash) {
		if rehashed, err := HashPassword(in.Password); err == nil {
			_ = s.users.UpdatePassword(ctx, user.ID, rehashed)
		}
	}

	if err := s.users.RecordLoginSuccess(ctx, user.ID, now); err != nil {
		return nil, err
	}
	return s.issueSession(ctx, user, in.RememberMe, in.UserAgent, in.IPAddress, now)
}

// Refresh exchanges a refresh token for a new pair, rotating the old one.
func (s *Service) Refresh(ctx context.Context, refreshToken, userAgent, ip string) (*Session, error) {
	now := s.now()
	hash := HashToken(refreshToken)

	var session *Session
	var resultErr error
	transactionErr := s.users.WithinTransaction(ctx, func(users repository.UserRepository) error {
		// The row lock serializes concurrent uses of the same refresh token. Only
		// one request can rotate it; the next observes the revocation as replay.
		stored, storedErr := users.FindRefreshTokenForUpdate(ctx, hash)
		if errors.Is(storedErr, repository.ErrNotFound) {
			return apperror.New(http.StatusUnauthorized, "INVALID_REFRESH_TOKEN",
				"Your session has expired. Please sign in again.", nil)
		}
		if storedErr != nil {
			return storedErr
		}

		if !stored.Usable(now) {
			if stored.RevokedAt != nil {
				if revokeErr := users.RevokeAllRefreshTokens(ctx, stored.UserID, now); revokeErr != nil {
					return revokeErr
				}
				// Commit the replay response before returning the public error.
				resultErr = apperror.New(http.StatusUnauthorized, "INVALID_REFRESH_TOKEN",
					"Your session has expired. Please sign in again.", nil)
				return nil
			}
			return apperror.New(http.StatusUnauthorized, "INVALID_REFRESH_TOKEN",
				"Your session has expired. Please sign in again.", nil)
		}

		user, userErr := users.FindByID(ctx, stored.UserID)
		if userErr != nil {
			return apperror.New(http.StatusUnauthorized, "INVALID_REFRESH_TOKEN",
				"Your session has expired. Please sign in again.", userErr)
		}
		if !user.IsActive {
			if revokeErr := users.RevokeAllRefreshTokens(ctx, user.ID, now); revokeErr != nil {
				return revokeErr
			}
			resultErr = apperror.New(http.StatusForbidden, "ACCOUNT_DISABLED",
				"This account has been disabled.", nil)
			return nil
		}

		if revokeErr := users.RevokeRefreshToken(ctx, hash, now); revokeErr != nil {
			return revokeErr
		}

		remember := stored.ExpiresAt.Sub(stored.CreatedAt) > s.sessionTTL
		var sessionErr error
		session, sessionErr = s.issueSessionWithRepository(
			ctx, users, user, remember, userAgent, ip, now)
		return sessionErr
	})
	if transactionErr != nil {
		return nil, transactionErr
	}
	if resultErr != nil {
		return nil, resultErr
	}
	return session, nil
}

// Logout revokes one session, or every session for the user.
func (s *Service) Logout(ctx context.Context, refreshToken string, allDevices bool) error {
	now := s.now()
	if refreshToken == "" {
		return nil
	}
	hash := HashToken(refreshToken)
	if !allDevices {
		return s.users.RevokeRefreshToken(ctx, hash, now)
	}
	stored, findErr := s.users.FindRefreshToken(ctx, hash)
	if errors.Is(findErr, repository.ErrNotFound) {
		return nil // already gone; nothing to revoke
	}
	if findErr != nil {
		return findErr
	}
	return s.users.RevokeAllRefreshTokens(ctx, stored.UserID, now)
}

// RequestPasswordReset issues a reset grant.
//
// Returns the token so the caller can deliver it. It returns no error for an
// unknown email: the endpoint must answer identically either way, or it becomes
// the account-enumeration oracle the login endpoint refuses to be.
func (s *Service) RequestPasswordReset(ctx context.Context, email string) (string, *model.User, error) {
	now := s.now()
	user, lookupErr := s.users.FindByEmail(ctx, NormalizeEmail(email))
	if errors.Is(lookupErr, repository.ErrNotFound) || (lookupErr == nil && !user.IsActive) {
		return "", nil, nil
	}
	if lookupErr != nil {
		return "", nil, lookupErr
	}

	token, tokenErr := NewOpaqueToken()
	if tokenErr != nil {
		return "", nil, tokenErr
	}
	transactionErr := s.users.WithinTransaction(ctx, func(users repository.UserRepository) error {
		// Lock the user row so two concurrent requests cannot both leave a reset
		// grant active. The later request deliberately supersedes the earlier one.
		if _, lockErr := users.FindByIDForUpdate(ctx, user.ID); lockErr != nil {
			return lockErr
		}
		if invalidateErr := users.InvalidatePasswordResetTokens(ctx, user.ID, now); invalidateErr != nil {
			return invalidateErr
		}
		return users.CreatePasswordResetToken(ctx, &model.PasswordResetToken{
			UserID: user.ID, TokenHash: HashToken(token), ExpiresAt: now.Add(ResetTokenTTL),
		})
	})
	if transactionErr != nil {
		return "", nil, transactionErr
	}
	return token, user, nil
}

// ResetPassword consumes a reset grant and sets a new password.
func (s *Service) ResetPassword(ctx context.Context, token, newPassword string) error {
	now := s.now()
	if err := ValidatePassword(newPassword); err != nil {
		return apperror.New(http.StatusUnprocessableEntity, "WEAK_PASSWORD", err.Error(), err)
	}

	hash, err := HashPassword(newPassword)
	if err != nil {
		return err
	}

	return s.users.WithinTransaction(ctx, func(users repository.UserRepository) error {
		stored, err := users.FindPasswordResetTokenForUpdate(ctx, HashToken(token))
		if errors.Is(err, repository.ErrNotFound) || (err == nil && !stored.Usable(now)) {
			return apperror.New(http.StatusBadRequest, "INVALID_RESET_TOKEN",
				"This reset link is invalid or has expired.", nil)
		}
		if err != nil {
			return err
		}
		if err := users.UpdatePassword(ctx, stored.UserID, hash); err != nil {
			return err
		}
		if err := users.MarkPasswordResetTokenUsed(ctx, stored.ID, now); err != nil {
			return err
		}
		return users.RevokeAllRefreshTokens(ctx, stored.UserID, now)
	})
}

func (s *Service) UserByID(ctx context.Context, id uint64) (*model.User, error) {
	return s.users.FindByID(ctx, id)
}

func (s *Service) issueSession(
	ctx context.Context,
	user *model.User,
	remember bool,
	userAgent, ip string,
	now time.Time,
) (*Session, error) {
	return s.issueSessionWithRepository(ctx, s.users, user, remember, userAgent, ip, now)
}

func (s *Service) issueSessionWithRepository(
	ctx context.Context,
	users repository.UserRepository,
	user *model.User,
	remember bool,
	userAgent, ip string,
	now time.Time,
) (*Session, error) {
	access, err := s.tokens.Issue(user.ID, user.Email, string(user.Role), now)
	if err != nil {
		return nil, err
	}
	refresh, err := NewOpaqueToken()
	if err != nil {
		return nil, err
	}

	ttl := s.sessionTTL
	if remember {
		ttl = s.rememberTTL
	}

	record := &model.RefreshToken{
		UserID:    user.ID,
		TokenHash: HashToken(refresh),
		ExpiresAt: now.Add(ttl),
		UserAgent: truncate(userAgent, 255),
		IPAddress: optionalString(ip),
		CreatedAt: now,
	}
	if err := users.CreateRefreshToken(ctx, record); err != nil {
		return nil, err
	}

	return &Session{
		User:         user,
		AccessToken:  access,
		RefreshToken: refresh,
		ExpiresIn:    int(s.tokens.AccessTTL().Seconds()),
		RefreshTTL:   ttl,
	}, nil
}

func optionalString(value string) *string {
	if value == "" {
		return nil
	}
	return &value
}

func truncate(s string, limit int) string {
	if len(s) <= limit {
		return s
	}
	return s[:limit]
}
