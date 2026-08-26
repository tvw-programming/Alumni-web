package model

import "time"

// Role mirrors the capability table the frontends use
// (core/auth/permissions.ts). The database CHECK constraint keeps the two in
// sync: an unknown role cannot be written.
type Role string

const (
	RoleAdmin Role = "admin"
	RoleUser  Role = "user"
)

func (r Role) Valid() bool {
	return r == RoleAdmin || r == RoleUser
}

// User is the identity record. PasswordHash carries `json:"-"` so it cannot
// leave the process through a response body even by accident — the struct is
// never the thing serialized, but defence in depth costs nothing here.
type User struct {
	ID           uint64 `gorm:"primaryKey;autoIncrement"`
	Email        string `gorm:"type:citext;not null;uniqueIndex"`
	PasswordHash string `gorm:"type:varchar(255);not null" json:"-"`
	DisplayName  string `gorm:"type:varchar(120);not null"`
	Role         Role   `gorm:"type:varchar(32);not null;default:user"`
	IsActive     bool   `gorm:"not null;default:true"`

	FailedLoginAttempts int `gorm:"not null;default:0"`
	LockedUntil         *time.Time

	LastLoginAt *time.Time
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

func (User) TableName() string { return "users" }

// Locked reports whether sign-in is currently refused for this account.
func (u *User) Locked(now time.Time) bool {
	return u.LockedUntil != nil && u.LockedUntil.After(now)
}

// RefreshToken is one long-lived session, one row per device.
//
// TokenHash is a SHA-256 of the opaque token; the token itself is returned to
// the client once and never stored, so a database dump cannot be replayed.
type RefreshToken struct {
	ID        uint64 `gorm:"primaryKey;autoIncrement"`
	UserID    uint64 `gorm:"not null;index"`
	TokenHash string `gorm:"type:char(64);not null;uniqueIndex"`
	ExpiresAt time.Time
	RevokedAt *time.Time
	UserAgent string  `gorm:"type:varchar(255)"`
	IPAddress *string `gorm:"type:inet"`
	CreatedAt time.Time
}

func (RefreshToken) TableName() string { return "refresh_tokens" }

// Usable reports whether the token may still be exchanged.
func (t *RefreshToken) Usable(now time.Time) bool {
	return t.RevokedAt == nil && t.ExpiresAt.After(now)
}

// PasswordResetToken is a single-use grant to set a new password.
type PasswordResetToken struct {
	ID        uint64 `gorm:"primaryKey;autoIncrement"`
	UserID    uint64 `gorm:"not null;index"`
	TokenHash string `gorm:"type:char(64);not null;uniqueIndex"`
	ExpiresAt time.Time
	UsedAt    *time.Time
	CreatedAt time.Time
}

func (PasswordResetToken) TableName() string { return "password_reset_tokens" }

func (t *PasswordResetToken) Usable(now time.Time) bool {
	return t.UsedAt == nil && t.ExpiresAt.After(now)
}
