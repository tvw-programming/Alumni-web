package background

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"gorm.io/gorm"
)

const (
	MaintenanceKind      = "maintenance.cleanup-expired"
	maintenanceUniqueKey = "maintenance.cleanup-expired"
)

func MaintenanceHandler(db *gorm.DB) Handler {
	return func(ctx context.Context, _ json.RawMessage) error {
		now := time.Now().UTC()
		return db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
			if err := tx.Exec(
				"DELETE FROM refresh_tokens WHERE expires_at <= ? OR (revoked_at IS NOT NULL AND revoked_at <= ?)",
				now, now.Add(-30*24*time.Hour),
			).Error; err != nil {
				return fmt.Errorf("clean refresh tokens: %w", err)
			}
			if err := tx.Exec(
				"DELETE FROM password_reset_tokens WHERE expires_at <= ? OR (used_at IS NOT NULL AND used_at <= ?)",
				now, now.Add(-24*time.Hour),
			).Error; err != nil {
				return fmt.Errorf("clean password reset tokens: %w", err)
			}
			if err := tx.Exec("DELETE FROM idempotency_records WHERE expires_at <= ?", now).Error; err != nil {
				return fmt.Errorf("clean idempotency records: %w", err)
			}
			if err := tx.Exec(
				"DELETE FROM background_jobs WHERE state IN ('completed', 'failed') AND updated_at <= ?",
				now.Add(-7*24*time.Hour),
			).Error; err != nil {
				return fmt.Errorf("clean background jobs: %w", err)
			}
			return nil
		})
	}
}

// ScheduleMaintenance keeps a single durable cleanup job queued. Unique-key
// enforcement in PostgreSQL makes this safe across multiple API replicas.
func ScheduleMaintenance(
	ctx context.Context,
	repository *Repository,
	every time.Duration,
	logger *slog.Logger,
) {
	key := maintenanceUniqueKey
	enqueue := func(runAt time.Time) {
		if err := repository.EnqueueUnique(ctx, MaintenanceKind, &key, struct{}{}, runAt, 5); err != nil &&
			!errors.Is(err, context.Canceled) {
			logger.Error("schedule maintenance job failed", "error", err)
		}
	}
	enqueue(time.Now())

	ticker := time.NewTicker(every)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case now := <-ticker.C:
			enqueue(now)
		}
	}
}
