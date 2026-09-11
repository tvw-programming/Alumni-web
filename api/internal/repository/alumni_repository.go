// Package repository holds the raw SQL. No ORM: the queries in db/queries are
// the ones that were tuned with EXPLAIN, and an ORM would generate different
// ones while looking like it did not.
package repository

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrNotFound = errors.New("not found")

type Alumni struct {
	ID            int64             `json:"id"`
	FullName      string            `json:"fullName"`
	YearOfPassing *int              `json:"yearOfPassing"`
	Course        string            `json:"course"`
	Mobile        string            `json:"mobile"`
	Email         string            `json:"email"`
	City          string            `json:"city"`
	Headline      string            `json:"headline"`
	Extra         map[string]string `json:"extra"`
	Status        string            `json:"status"`
	PendingMedia  int               `json:"pendingMedia"`
	CreatedAt     string            `json:"createdAt"`
}

type Page struct {
	Rows  []Alumni `json:"rows"`
	Total int      `json:"total"`
}

type AlumniRepository struct{ pool *pgxpool.Pool }

func NewAlumniRepository(pool *pgxpool.Pool) *AlumniRepository {
	return &AlumniRepository{pool: pool}
}

const selectColumns = `
    p.id, p.full_name, p.graduation_year, COALESCE(p.course, ''), COALESCE(p.mobile, ''),
    p.email::text, COALESCE(p.city, ''), COALESCE(p.headline, ''), p.extra, p.status,
    (SELECT COUNT(*) FROM media_gallery m
      WHERE m.alumni_id = p.id AND m.moderation_status = 'pending'),
    to_char(p.created_at, 'YYYY-MM-DD"T"HH24:MI:SSOF')`

// List is db/queries/alumni.sql :: AlumniAdminSearch. Every value is a
// parameter — nothing is formatted into the SQL, including the search term.
func (r *AlumniRepository) List(ctx context.Context, search, status string, limit, offset int) (Page, error) {
	const query = `
SELECT ` + selectColumns + `, COUNT(*) OVER () AS total_count
FROM alumni_profiles p
WHERE ($1::TEXT IS NULL OR p.status = $1)
  AND ($2::TEXT IS NULL OR p.full_name ILIKE '%' || $2 || '%'
                        OR p.email::text ILIKE '%' || $2 || '%'
                        OR p.course ILIKE '%' || $2 || '%')
  AND p.status <> 'deleted'
ORDER BY p.created_at DESC, p.id DESC
LIMIT $3 OFFSET $4`

	rows, err := r.pool.Query(ctx, query, nullable(status), nullable(search), limit, offset)
	if err != nil {
		return Page{}, fmt.Errorf("listing alumni: %w", err)
	}
	defer rows.Close()

	page := Page{Rows: []Alumni{}}
	for rows.Next() {
		var a Alumni
		var extra []byte
		var total int
		if err := rows.Scan(&a.ID, &a.FullName, &a.YearOfPassing, &a.Course, &a.Mobile,
			&a.Email, &a.City, &a.Headline, &extra, &a.Status, &a.PendingMedia,
			&a.CreatedAt, &total); err != nil {
			return Page{}, fmt.Errorf("scanning alumni: %w", err)
		}
		a.Extra = decodeExtra(extra)
		page.Rows = append(page.Rows, a)
		page.Total = total
	}
	return page, rows.Err()
}

type Draft struct {
	FullName      string            `json:"fullName"`
	YearOfPassing *int              `json:"yearOfPassing"`
	Course        string            `json:"course"`
	Mobile        string            `json:"mobile"`
	Email         string            `json:"email"`
	City          string            `json:"city"`
	Headline      string            `json:"headline"`
	Extra         map[string]string `json:"extra"`
}

func (r *AlumniRepository) Create(ctx context.Context, d Draft) (Alumni, error) {
	const query = `
INSERT INTO alumni_profiles
    (full_name, graduation_year, course, mobile, email, city, headline, extra)
VALUES ($1, $2, $3, NULLIF($4, ''), $5, NULLIF($6, ''), NULLIF($7, ''), $8)
RETURNING id`

	extra, err := encodeExtra(d.Extra)
	if err != nil {
		return Alumni{}, err
	}
	// email is NOT NULL and unique; a blank one would collide on the second
	// insert, so it is synthesised from the name until a real one arrives.
	email := d.Email
	if strings.TrimSpace(email) == "" {
		email = placeholderEmail(d.FullName)
	}

	var id int64
	if err := r.pool.QueryRow(ctx, query, d.FullName, d.YearOfPassing, nullable(d.Course),
		d.Mobile, email, d.City, d.Headline, extra).Scan(&id); err != nil {
		return Alumni{}, fmt.Errorf("creating alumni: %w", err)
	}
	return r.Get(ctx, id)
}

func (r *AlumniRepository) Update(ctx context.Context, id int64, d Draft) (Alumni, error) {
	const query = `
UPDATE alumni_profiles SET
    full_name = $2, graduation_year = $3, course = $4, mobile = NULLIF($5, ''),
    email = $6, city = NULLIF($7, ''), headline = NULLIF($8, ''), extra = $9
WHERE id = $1`

	extra, err := encodeExtra(d.Extra)
	if err != nil {
		return Alumni{}, err
	}
	tag, err := r.pool.Exec(ctx, query, id, d.FullName, d.YearOfPassing, nullable(d.Course),
		d.Mobile, d.Email, d.City, d.Headline, extra)
	if err != nil {
		return Alumni{}, fmt.Errorf("updating alumni: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return Alumni{}, ErrNotFound
	}
	return r.Get(ctx, id)
}

func (r *AlumniRepository) Get(ctx context.Context, id int64) (Alumni, error) {
	const query = `SELECT ` + selectColumns + ` FROM alumni_profiles p WHERE p.id = $1`

	var a Alumni
	var extra []byte
	err := r.pool.QueryRow(ctx, query, id).Scan(&a.ID, &a.FullName, &a.YearOfPassing,
		&a.Course, &a.Mobile, &a.Email, &a.City, &a.Headline, &extra, &a.Status,
		&a.PendingMedia, &a.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return Alumni{}, ErrNotFound
	}
	if err != nil {
		return Alumni{}, fmt.Errorf("reading alumni %d: %w", id, err)
	}
	a.Extra = decodeExtra(extra)
	return a, nil
}

// Delete is soft: status becomes 'deleted' rather than the row going away.
// Media, education and career rows cascade on a real delete, and an admin
// mis-click should not be the thing that discovers that.
func (r *AlumniRepository) Delete(ctx context.Context, ids []int64) (int64, error) {
	tag, err := r.pool.Exec(ctx,
		`UPDATE alumni_profiles SET status = 'deleted' WHERE id = ANY($1)`, ids)
	if err != nil {
		return 0, fmt.Errorf("deleting alumni: %w", err)
	}
	return tag.RowsAffected(), nil
}

// Import writes every row in one transaction. A spreadsheet is one action from
// the operator's point of view, so it either lands or it does not.
func (r *AlumniRepository) Import(ctx context.Context, drafts []Draft) (int, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return 0, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	created := 0
	for _, d := range drafts {
		extra, err := encodeExtra(d.Extra)
		if err != nil {
			return 0, err
		}
		email := d.Email
		if strings.TrimSpace(email) == "" {
			email = placeholderEmail(d.FullName)
		}
		if _, err := tx.Exec(ctx, `
INSERT INTO alumni_profiles
    (full_name, graduation_year, course, mobile, email, city, headline, extra)
VALUES ($1, $2, $3, NULLIF($4, ''), $5, NULLIF($6, ''), NULLIF($7, ''), $8)
ON CONFLICT (email) DO NOTHING`,
			d.FullName, d.YearOfPassing, nullable(d.Course), d.Mobile, email,
			d.City, d.Headline, extra); err != nil {
			return 0, fmt.Errorf("importing %q: %w", d.FullName, err)
		}
		created++
	}
	return created, tx.Commit(ctx)
}

// nullable turns "" into a real SQL NULL, so a blank filter means "any" rather
// than "equal to empty string".
func nullable(s string) *string {
	if strings.TrimSpace(s) == "" {
		return nil
	}
	return &s
}

func encodeExtra(extra map[string]string) ([]byte, error) {
	if extra == nil {
		extra = map[string]string{}
	}
	b, err := json.Marshal(extra)
	if err != nil {
		return nil, fmt.Errorf("encoding extra: %w", err)
	}
	return b, nil
}

func decodeExtra(raw []byte) map[string]string {
	out := map[string]string{}
	if len(raw) > 0 {
		// A value that is not a flat object is skipped rather than failing the
		// read: the CHECK constraint keeps it an object, but hand-edited data
		// should not take a whole page down.
		_ = json.Unmarshal(raw, &out)
	}
	return out
}

func placeholderEmail(name string) string {
	slug := strings.ToLower(strings.ReplaceAll(strings.TrimSpace(name), " ", "."))
	if slug == "" {
		slug = "unnamed"
	}
	return fmt.Sprintf("%s+%d@placeholder.invalid", slug, len(name))
}
