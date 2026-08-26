package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"github.com/example/idol-promo/api/internal/model"
)

// ErrNotFound lets callers distinguish "no such row" from a real database
// failure without importing gorm.
var ErrNotFound = errors.New("not found")

const (
	updateLockStrength        = "UPDATE"
	failedLoginAttemptsColumn = "failed_login_attempts"
	lockedUntilColumn         = "locked_until"
)

type UserRepository interface {
	WithinTransaction(ctx context.Context, fn func(UserRepository) error) error

	FindByEmail(ctx context.Context, email string) (*model.User, error)
	FindByID(ctx context.Context, id uint64) (*model.User, error)
	FindByIDForUpdate(ctx context.Context, id uint64) (*model.User, error)
	UpdatePassword(ctx context.Context, userID uint64, passwordHash string) error
	RecordLoginSuccess(ctx context.Context, userID uint64, at time.Time) error
	RecordLoginFailure(ctx context.Context, userID uint64, maxAttempts int, lockUntil time.Time) error

	CreateRefreshToken(ctx context.Context, token *model.RefreshToken) error
	FindRefreshToken(ctx context.Context, tokenHash string) (*model.RefreshToken, error)
	FindRefreshTokenForUpdate(ctx context.Context, tokenHash string) (*model.RefreshToken, error)
	RevokeRefreshToken(ctx context.Context, tokenHash string, at time.Time) error
	RevokeAllRefreshTokens(ctx context.Context, userID uint64, at time.Time) error

	CreatePasswordResetToken(ctx context.Context, token *model.PasswordResetToken) error
	InvalidatePasswordResetTokens(ctx context.Context, userID uint64, at time.Time) error
	FindPasswordResetToken(ctx context.Context, tokenHash string) (*model.PasswordResetToken, error)
	FindPasswordResetTokenForUpdate(ctx context.Context, tokenHash string) (*model.PasswordResetToken, error)
	MarkPasswordResetTokenUsed(ctx context.Context, id uint64, at time.Time) error
}

type userRepository struct {
	db *gorm.DB
}

func NewUserRepository(db *gorm.DB) UserRepository {
	return &userRepository{db: db}
}

func (r *userRepository) WithinTransaction(
	ctx context.Context,
	fn func(UserRepository) error,
) error {
	if err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		return fn(&userRepository{db: tx})
	}); err != nil {
		return fmt.Errorf("user repository transaction: %w", err)
	}
	return nil
}

func (r *userRepository) FindByEmail(ctx context.Context, email string) (*model.User, error) {
	var user model.User
	// `email` is CITEXT, so this is case-insensitive and still uses the index.
	err := r.db.WithContext(ctx).Where("email = ?", email).First(&user).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("find user by email: %w", err)
	}
	return &user, nil
}

func (r *userRepository) FindByID(ctx context.Context, id uint64) (*model.User, error) {
	return r.findByID(ctx, id, false)
}

func (r *userRepository) FindByIDForUpdate(ctx context.Context, id uint64) (*model.User, error) {
	return r.findByID(ctx, id, true)
}

func (r *userRepository) findByID(ctx context.Context, id uint64, forUpdate bool) (*model.User, error) {
	var user model.User
	query := r.db.WithContext(ctx)
	if forUpdate {
		query = query.Clauses(clause.Locking{Strength: updateLockStrength})
	}
	err := query.First(&user, id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("find user by id: %w", err)
	}
	return &user, nil
}

func (r *userRepository) UpdatePassword(ctx context.Context, userID uint64, passwordHash string) error {
	// Changing the password also clears the lockout: the person proved control
	// of the mailbox, and leaving them locked out would be its own denial of
	// service.
	err := r.db.WithContext(ctx).Model(&model.User{}).
		Where("id = ?", userID).
		Updates(map[string]any{
			"password_hash":           passwordHash,
			failedLoginAttemptsColumn: 0,
			lockedUntilColumn:         nil,
		}).Error
	if err != nil {
		return fmt.Errorf("update password: %w", err)
	}
	return nil
}

func (r *userRepository) RecordLoginSuccess(ctx context.Context, userID uint64, at time.Time) error {
	err := r.db.WithContext(ctx).Model(&model.User{}).
		Where("id = ?", userID).
		Updates(map[string]any{
			failedLoginAttemptsColumn: 0,
			lockedUntilColumn:         nil,
			"last_login_at":           at,
		}).Error
	if err != nil {
		return fmt.Errorf("record login success: %w", err)
	}
	return nil
}

func (r *userRepository) RecordLoginFailure(
	ctx context.Context,
	userID uint64,
	maxAttempts int,
	lockUntil time.Time,
) error {
	// Incremented in SQL rather than read-modify-write: two concurrent failed
	// attempts must both count, and a lost update is exactly what an attacker
	// racing the endpoint would want.
	updates := map[string]any{
		failedLoginAttemptsColumn: gorm.Expr("failed_login_attempts + 1"),
		lockedUntilColumn: gorm.Expr(
			"CASE WHEN failed_login_attempts + 1 >= ? THEN ? ELSE locked_until END",
			maxAttempts, lockUntil,
		),
	}
	err := r.db.WithContext(ctx).Model(&model.User{}).
		Where("id = ?", userID).Updates(updates).Error
	if err != nil {
		return fmt.Errorf("record login failure: %w", err)
	}
	return nil
}

func (r *userRepository) CreateRefreshToken(ctx context.Context, token *model.RefreshToken) error {
	if err := r.db.WithContext(ctx).Create(token).Error; err != nil {
		return fmt.Errorf("create refresh token: %w", err)
	}
	return nil
}

func (r *userRepository) FindRefreshToken(ctx context.Context, tokenHash string) (*model.RefreshToken, error) {
	return r.findRefreshToken(ctx, tokenHash, false)
}

func (r *userRepository) FindRefreshTokenForUpdate(
	ctx context.Context,
	tokenHash string,
) (*model.RefreshToken, error) {
	return r.findRefreshToken(ctx, tokenHash, true)
}

func (r *userRepository) findRefreshToken(
	ctx context.Context,
	tokenHash string,
	forUpdate bool,
) (*model.RefreshToken, error) {
	var token model.RefreshToken
	query := r.db.WithContext(ctx)
	if forUpdate {
		query = query.Clauses(clause.Locking{Strength: updateLockStrength})
	}
	err := query.Where("token_hash = ?", tokenHash).First(&token).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("find refresh token: %w", err)
	}
	return &token, nil
}

func (r *userRepository) RevokeRefreshToken(ctx context.Context, tokenHash string, at time.Time) error {
	err := r.db.WithContext(ctx).Model(&model.RefreshToken{}).
		Where("token_hash = ? AND revoked_at IS NULL", tokenHash).
		Update("revoked_at", at).Error
	if err != nil {
		return fmt.Errorf("revoke refresh token: %w", err)
	}
	return nil
}

func (r *userRepository) RevokeAllRefreshTokens(ctx context.Context, userID uint64, at time.Time) error {
	err := r.db.WithContext(ctx).Model(&model.RefreshToken{}).
		Where("user_id = ? AND revoked_at IS NULL", userID).
		Update("revoked_at", at).Error
	if err != nil {
		return fmt.Errorf("revoke all refresh tokens: %w", err)
	}
	return nil
}

func (r *userRepository) CreatePasswordResetToken(ctx context.Context, token *model.PasswordResetToken) error {
	if err := r.db.WithContext(ctx).Create(token).Error; err != nil {
		return fmt.Errorf("create password reset token: %w", err)
	}
	return nil
}

func (r *userRepository) InvalidatePasswordResetTokens(
	ctx context.Context,
	userID uint64,
	at time.Time,
) error {
	if err := r.db.WithContext(ctx).Model(&model.PasswordResetToken{}).
		Where("user_id = ? AND used_at IS NULL", userID).
		Update("used_at", at).Error; err != nil {
		return fmt.Errorf("invalidate password reset tokens: %w", err)
	}
	return nil
}

func (r *userRepository) FindPasswordResetToken(ctx context.Context, tokenHash string) (*model.PasswordResetToken, error) {
	return r.findPasswordResetToken(ctx, tokenHash, false)
}

func (r *userRepository) FindPasswordResetTokenForUpdate(
	ctx context.Context,
	tokenHash string,
) (*model.PasswordResetToken, error) {
	return r.findPasswordResetToken(ctx, tokenHash, true)
}

func (r *userRepository) findPasswordResetToken(
	ctx context.Context,
	tokenHash string,
	forUpdate bool,
) (*model.PasswordResetToken, error) {
	var token model.PasswordResetToken
	query := r.db.WithContext(ctx)
	if forUpdate {
		query = query.Clauses(clause.Locking{Strength: updateLockStrength})
	}
	err := query.Where("token_hash = ?", tokenHash).First(&token).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("find password reset token: %w", err)
	}
	return &token, nil
}

func (r *userRepository) MarkPasswordResetTokenUsed(ctx context.Context, id uint64, at time.Time) error {
	err := r.db.WithContext(ctx).Model(&model.PasswordResetToken{}).
		Where("id = ? AND used_at IS NULL", id).
		Update("used_at", at).Error
	if err != nil {
		return fmt.Errorf("mark password reset token used: %w", err)
	}
	return nil
}
