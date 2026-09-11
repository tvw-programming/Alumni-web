package repository

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// MediaRepository owns media_gallery. The lifecycle it enforces is in the
// statements, not in the caller: a row is created pending, marked uploaded when
// the bucket says the bytes landed, and moderated exactly once.
type MediaRepository struct{ pool *pgxpool.Pool }

func NewMediaRepository(pool *pgxpool.Pool) *MediaRepository {
	return &MediaRepository{pool: pool}
}

// CreatePending records an upload we have granted but not yet received. It is
// what makes the storage webhook safe: an object path nobody was granted has no
// row, so it is never published.
func (r *MediaRepository) CreatePending(
	ctx context.Context, alumniID int64, objectPath, contentType, caption string,
) (int64, error) {
	const query = `
INSERT INTO media_gallery (alumni_id, object_path, content_type, caption, moderation_status)
VALUES ($1, $2, $3, NULLIF($4, ''), 'pending')
RETURNING id`

	var id int64
	if err := r.pool.QueryRow(ctx, query, alumniID, objectPath, contentType, caption).Scan(&id); err != nil {
		return 0, fmt.Errorf("recording pending upload: %w", err)
	}
	return id, nil
}

// MarkUploaded stamps the arrival and returns the row to moderate.
//
// The uploaded_at IS NULL guard makes a redelivered notification a no-op rather
// than a second moderation of the same object.
func (r *MediaRepository) MarkUploaded(ctx context.Context, objectPath string) (int64, error) {
	const query = `
UPDATE media_gallery
SET uploaded_at = NOW()
WHERE object_path = $1 AND uploaded_at IS NULL
RETURNING id`

	var id int64
	err := r.pool.QueryRow(ctx, query, objectPath).Scan(&id)
	if errors.Is(err, pgx.ErrNoRows) {
		return 0, ErrNotFound
	}
	if err != nil {
		return 0, fmt.Errorf("marking upload complete: %w", err)
	}
	return id, nil
}

func (r *MediaRepository) ObjectPath(ctx context.Context, mediaID int64) (string, error) {
	var path string
	err := r.pool.QueryRow(ctx,
		`SELECT object_path FROM media_gallery WHERE id = $1`, mediaID).Scan(&path)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", ErrNotFound
	}
	return path, err
}

// MarkModerated is db/queries/alumni.sql :: MediaMarkModerated — the only
// statement permitted to advance moderation_status, and idempotent because of
// the status guard.
func (r *MediaRepository) MarkModerated(
	ctx context.Context, mediaID int64, verdict string, labels json.RawMessage,
) error {
	const query = `
UPDATE media_gallery
SET moderation_status = $2, moderation_labels = $3::JSONB, moderation_checked_at = NOW()
WHERE id = $1 AND moderation_status = 'pending'`

	if len(labels) == 0 {
		labels = json.RawMessage(`{}`)
	}
	_, err := r.pool.Exec(ctx, query, mediaID, verdict, string(labels))
	if err != nil {
		return fmt.Errorf("recording moderation: %w", err)
	}
	// No rows affected is not an error: a second delivery finding the row
	// already decided is exactly what the guard is for.
	return nil
}

// IDForFirebaseUID resolves the caller's own profile.
//
// The uid comes from a verified token, never from a request body, which is what
// stops one person uploading into another's gallery.
func (r *AlumniRepository) IDForFirebaseUID(ctx context.Context, uid string) (int64, error) {
	if uid == "" {
		return 0, ErrNotFound
	}
	var id int64
	err := r.pool.QueryRow(ctx,
		`SELECT id FROM alumni_profiles WHERE firebase_uid = $1`, uid).Scan(&id)
	if errors.Is(err, pgx.ErrNoRows) {
		return 0, ErrNotFound
	}
	return id, err
}
