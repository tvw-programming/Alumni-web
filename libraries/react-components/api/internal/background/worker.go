package background

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"time"
)

type Handler func(context.Context, json.RawMessage) error

var ErrHandlerNotRegistered = errors.New("background job handler is not registered")

type Worker struct {
	repository *Repository
	workerID   string
	handlers   map[string]Handler
	pollEvery  time.Duration
	jobTimeout time.Duration
	logger     *slog.Logger
}

func NewWorker(
	repository *Repository,
	workerID string,
	handlers map[string]Handler,
	pollEvery time.Duration,
	jobTimeout time.Duration,
	logger *slog.Logger,
) *Worker {
	return &Worker{
		repository: repository,
		workerID:   workerID,
		handlers:   handlers,
		pollEvery:  pollEvery,
		jobTimeout: jobTimeout,
		logger:     logger,
	}
}

func (w *Worker) Run(ctx context.Context) {
	ticker := time.NewTicker(w.pollEvery)
	defer ticker.Stop()

	for {
		processed, err := w.processOne(ctx)
		if err != nil && !errors.Is(err, context.Canceled) {
			w.logger.Error("background worker iteration failed", "error", err)
		}
		if processed && err == nil {
			// Drain available work without imposing the polling delay between jobs.
			continue
		}
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
		}
	}
}

func (w *Worker) processOne(ctx context.Context) (bool, error) {
	if err := w.repository.RecoverStale(ctx, time.Now().Add(-2*w.jobTimeout)); err != nil {
		return false, err
	}
	job, err := w.repository.Claim(ctx, w.workerID, time.Now())
	if errors.Is(err, ErrNoRunnableJob) {
		return false, nil
	}
	if err != nil {
		return false, err
	}

	handle, ok := w.handlers[job.Kind]
	if !ok {
		handle = func(context.Context, json.RawMessage) error {
			return fmt.Errorf("%w: %s", ErrHandlerNotRegistered, job.Kind)
		}
	}

	jobCtx, cancel := context.WithTimeout(ctx, w.jobTimeout)
	err = handle(jobCtx, job.Payload)
	cancel()
	if err == nil {
		if completeErr := w.repository.Complete(ctx, job.ID, time.Now()); completeErr != nil {
			return true, completeErr
		}
		w.logger.Info("background job completed", "job_id", job.ID, "kind", job.Kind)
		return true, nil
	}

	// Exponential retry with a one-hour ceiling. Attempts is already incremented
	// by Claim, so the first failure waits two seconds.
	delay := time.Second * time.Duration(1<<min(job.Attempts, 12))
	if delay > time.Hour {
		delay = time.Hour
	}
	if retryErr := w.repository.FailOrRetry(ctx, job, err, time.Now(), delay); retryErr != nil {
		return true, errors.Join(err, retryErr)
	}
	w.logger.Warn("background job failed", "job_id", job.ID, "kind", job.Kind,
		"attempt", job.Attempts, "retry_in", delay, "error", err)
	return true, nil
}
