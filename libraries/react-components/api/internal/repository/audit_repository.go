package repository

import (
	"context"
	"fmt"

	"gorm.io/gorm"

	"github.com/example/idol-promo/api/internal/model"
)

type AuditRepository interface {
	Record(context.Context, *model.AuditEvent) error
}

type auditRepository struct{ db *gorm.DB }

func NewAuditRepository(db *gorm.DB) AuditRepository {
	return &auditRepository{db: db}
}

func (r *auditRepository) Record(ctx context.Context, event *model.AuditEvent) error {
	if event.Metadata == nil {
		event.Metadata = map[string]any{}
	}
	if err := r.db.WithContext(ctx).Create(event).Error; err != nil {
		return fmt.Errorf("record audit event: %w", err)
	}
	return nil
}
