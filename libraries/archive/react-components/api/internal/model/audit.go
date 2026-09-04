package model

import "time"

type AuditEvent struct {
	ID           uint64         `gorm:"primaryKey;autoIncrement"`
	ActorUserID  *uint64        `gorm:"index"`
	Action       string         `gorm:"type:varchar(100);not null"`
	ResourceType string         `gorm:"type:varchar(80);not null"`
	ResourceID   *string        `gorm:"type:varchar(120)"`
	RequestID    *string        `gorm:"type:text"`
	IPAddress    string         `gorm:"type:inet"`
	Metadata     map[string]any `gorm:"serializer:json;type:jsonb;not null"`
	CreatedAt    time.Time
}

func (AuditEvent) TableName() string { return "audit_events" }
