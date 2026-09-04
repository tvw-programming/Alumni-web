package background

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"github.com/example/idol-promo/api/internal/model"
)

var (
	ErrNoRunnableJob      = errors.New("no runnable background job")
	ErrJobKindRequired    = errors.New("background job kind is required")
	ErrInvalidMaxAttempts = errors.New("background job max attempts must be positive")
	ErrJobNotRunning      = errors.New("background job is not running")
)

const (
	jobStatePending = "pending"
	jobStateRunning = "running"
	stateColumn     = "state"
	lockedAtColumn  = "locked_at"
	lockedByColumn  = "locked_by"
	lastErrorColumn = "last_error"
)

type Repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) *Repository { return &Repository{db: db} }

func (r *Repository) RecoverStale(ctx context.Context, lockedBefore time.Time) error {
	if err := r.db.WithContext(ctx).Model(&model.BackgroundJob{}).
		Where("state = ? AND locked_at <= ?", jobStateRunning, lockedBefore.UTC()).
		Updates(map[string]any{
			stateColumn:     jobStatePending,
			lockedAtColumn:  nil,
			lockedByColumn:  nil,
			lastErrorColumn: "worker lease expired",
		}).Error; err != nil {
		return fmt.Errorf("recover stale background jobs: %w", err)
	}
	return nil
}

// EnqueueUnique creates a job unless the same unique key is already pending or
// running. A nil key is appropriate for work that may have multiple instances.
func (r *Repository) EnqueueUnique(
	ctx context.Context,
	kind string,
	uniqueKey *string,
	payload any,
	runAt time.Time,
	maxAttempts int,
) error {
	if strings.TrimSpace(kind) == "" {
		return ErrJobKindRequired
	}
	if maxAttempts < 1 {
		return ErrInvalidMaxAttempts
	}
	encoded, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("marshal background job payload: %w", err)
	}
	job := model.BackgroundJob{
		Kind:        kind,
		UniqueKey:   uniqueKey,
		Payload:     encoded,
		State:       jobStatePending,
		MaxAttempts: maxAttempts,
		RunAt:       runAt.UTC(),
	}
	query := r.db.WithContext(ctx)
	if uniqueKey != nil {
		query = query.Clauses(clause.OnConflict{DoNothing: true})
	}
	if err := query.Create(&job).Error; err != nil {
		return fmt.Errorf("enqueue background job: %w", err)
	}
	return nil
}

// Claim locks one row with SKIP LOCKED, so multiple API replicas can safely run
// workers without either double-processing a job or blocking one another.
func (r *Repository) Claim(ctx context.Context, workerID string, now time.Time) (*model.BackgroundJob, error) {
	var claimed model.BackgroundJob
	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		query := tx.Clauses(clause.Locking{Strength: "UPDATE", Options: "SKIP LOCKED"}).
			Where("state = ? AND run_at <= ?", jobStatePending, now.UTC()).
			Order("run_at ASC, id ASC").
			First(&claimed)
		if errors.Is(query.Error, gorm.ErrRecordNotFound) {
			return ErrNoRunnableJob
		}
		if query.Error != nil {
			return query.Error
		}

		lockedAt := now.UTC()
		if err := tx.Model(&model.BackgroundJob{}).Where("id = ?", claimed.ID).Updates(map[string]any{
			stateColumn:    jobStateRunning,
			"attempts":     gorm.Expr("attempts + 1"),
			lockedAtColumn: lockedAt,
			lockedByColumn: workerID,
		}).Error; err != nil {
			return err
		}
		claimed.State = jobStateRunning
		claimed.Attempts++
		claimed.LockedAt = &lockedAt
		claimed.LockedBy = &workerID
		return nil
	})
	if errors.Is(err, ErrNoRunnableJob) {
		return nil, ErrNoRunnableJob
	}
	if err != nil {
		return nil, fmt.Errorf("claim background job: %w", err)
	}
	return &claimed, nil
}

func (r *Repository) Complete(ctx context.Context, id uint64, now time.Time) error {
	result := r.db.WithContext(ctx).Model(&model.BackgroundJob{}).
		Where("id = ? AND state = ?", id, jobStateRunning).
		Updates(map[string]any{
			stateColumn:     "completed",
			"completed_at":  now.UTC(),
			lockedAtColumn:  nil,
			lockedByColumn:  nil,
			lastErrorColumn: nil,
		})
	if result.Error != nil {
		return fmt.Errorf("complete background job: %w", result.Error)
	}
	if result.RowsAffected != 1 {
		return fmt.Errorf("%w: id %d", ErrJobNotRunning, id)
	}
	return nil
}

func (r *Repository) FailOrRetry(
	ctx context.Context,
	job *model.BackgroundJob,
	cause error,
	now time.Time,
	delay time.Duration,
) error {
	message := strings.TrimSpace(cause.Error())
	if len(message) > 2000 {
		message = message[:2000]
	}
	updates := map[string]any{
		lastErrorColumn: message,
		lockedAtColumn:  nil,
		lockedByColumn:  nil,
	}
	if job.Attempts >= job.MaxAttempts {
		updates[stateColumn] = "failed"
	} else {
		updates[stateColumn] = jobStatePending
		updates["run_at"] = now.UTC().Add(delay)
	}
	result := r.db.WithContext(ctx).Model(&model.BackgroundJob{}).
		Where("id = ? AND state = ?", job.ID, jobStateRunning).Updates(updates)
	if result.Error != nil {
		return fmt.Errorf("retry background job: %w", result.Error)
	}
	if result.RowsAffected != 1 {
		return fmt.Errorf("%w: id %d", ErrJobNotRunning, job.ID)
	}
	return nil
}
