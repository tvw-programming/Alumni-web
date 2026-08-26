package model

import (
	"encoding/json"
	"time"
)

// BackgroundJob is a durable unit of work claimed from PostgreSQL. Keeping the
// queue in the primary database gives API writes and future job creation the
// option to share one GORM transaction without introducing Redis.
type BackgroundJob struct {
	ID          uint64          `gorm:"primaryKey"`
	Kind        string          `gorm:"size:100;not null"`
	UniqueKey   *string         `gorm:"size:160"`
	Payload     json.RawMessage `gorm:"serializer:json;type:jsonb;not null"`
	State       string          `gorm:"size:16;not null"`
	Attempts    int             `gorm:"not null"`
	MaxAttempts int             `gorm:"not null"`
	RunAt       time.Time       `gorm:"not null"`
	LockedAt    *time.Time
	LockedBy    *string `gorm:"size:120"`
	LastError   *string
	CompletedAt *time.Time
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

func (BackgroundJob) TableName() string { return "background_jobs" }
