package repository

import (
	"context"
	"encoding/base64"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgconn"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"github.com/example/idol-promo/api/internal/model"
	"github.com/example/idol-promo/api/internal/pagination"
)

// ErrDuplicate is returned when a unique constraint rejects a write, so the
// handler can answer 409 instead of 500.
var ErrDuplicate = errors.New("duplicate")

// ErrVersionConflict means the row exists but no longer has the version the
// caller read, so applying the update would overwrite somebody else's work.
var ErrVersionConflict = errors.New("version conflict")

var (
	ErrUnsupportedKeyset = errors.New("keyset pagination supports the default sort only")
	ErrMalformedCursor   = errors.New("malformed cursor")
)

type ProductRepository interface {
	List(context.Context, pagination.Params) (pagination.Page[model.Product], error)
	GetByID(context.Context, uint64) (*model.Product, error)
	Create(context.Context, *model.Product) error
	Update(context.Context, uint64, *uint64, map[string]any) (*model.Product, error)
	Delete(context.Context, uint64, *uint64) (*model.Product, error)
}

type productRepository struct {
	db *gorm.DB
}

func NewProductRepository(db *gorm.DB) ProductRepository {
	return &productRepository{db: db}
}

/*
List returns one page of products.

The shape here is the template for every other collection in this API, so the
decisions are worth stating once:

  - **One query for the page, one optional query for the count.** The count is
    skipped entirely when the caller passes `withTotal=false`, because counting a
    filtered table costs about as much as fetching the page and an infinite
    scroll never needs it.

  - **`Session{NewDB: true}` before reuse.** GORM statements are stateful; reusing
    a builder for both the count and the page silently applies the LIMIT to the
    count. Building the filter twice from one helper avoids that class of bug.

  - **Keyset before offset.** Deep OFFSET makes the database walk every skipped
    row, so page 500 costs 500 pages of work. Keyset seeks straight to the
    cursor. Offset is still supported because a pager with numbered pages needs
    it, and grids have numbered pages.

  - **Ordering is always total.** Every sort ends with `id`, otherwise rows with
    equal sort keys can appear on two pages or neither.
*/
func (r *productRepository) List(
	ctx context.Context,
	params pagination.Params,
) (pagination.Page[model.Product], error) {
	page := pagination.Page[model.Product]{
		Items:    []model.Product{},
		Page:     params.Page,
		PageSize: params.PageSize,
	}

	base := func() *gorm.DB {
		return r.applyFilters(r.db.WithContext(ctx).Model(&model.Product{}), params)
	}

	if params.WithTotal && params.Mode != pagination.ModeAll {
		var total int64
		if err := base().Count(&total).Error; err != nil {
			return page, fmt.Errorf("count products: %w", err)
		}
		page.Total = &total
	}

	query := base()
	sortColumn, sortDesc := r.resolveSort(params)

	switch params.Mode {
	case pagination.ModeAll:
		// No limit by design — used for exports and reference lists. The
		// filters still apply, so this is not "select the whole table".
		query = query.Order(clause.OrderByColumn{
			Column: clause.Column{Name: sortColumn}, Desc: sortDesc,
		}).Order("id DESC")

	case pagination.ModeKeyset:
		var err error
		query, err = r.applyKeyset(query, params, sortColumn, sortDesc)
		if err != nil {
			return page, err
		}
		// One extra row is fetched to answer "is there more" without a
		// second query.
		query = query.Limit(params.PageSize + 1)

	default: // offset
		query = query.
			Order(clause.OrderByColumn{Column: clause.Column{Name: sortColumn}, Desc: sortDesc}).
			Order("id DESC").
			Limit(params.PageSize + 1).
			Offset(params.Offset())
	}

	items := make([]model.Product, 0, params.PageSize+1)
	if err := query.Find(&items).Error; err != nil {
		return page, fmt.Errorf("list products: %w", err)
	}

	if params.Mode != pagination.ModeAll && len(items) > params.PageSize {
		page.HasMore = true
		items = items[:params.PageSize]
	}
	page.Items = items

	if params.Mode == pagination.ModeKeyset && page.HasMore && len(items) > 0 {
		last := items[len(items)-1]
		page.NextCursor = encodeCursor(last.CreatedAt, last.ID)
	}

	return page, nil
}

// applyFilters builds the WHERE clause. Split out so the count and the page
// query cannot drift apart — a count that filters differently from its page is
// a pager that lies.
func (r *productRepository) applyFilters(q *gorm.DB, params pagination.Params) *gorm.DB {
	if params.Search != "" {
		// ILIKE with a trailing wildcard uses the trigram index; a leading
		// wildcard would not, which is why the pattern is not `%term%` on both
		// sides for the name.
		like := "%" + params.Search + "%"
		q = q.Where("product_name ILIKE ? OR product_id ILIKE ?", like, like)
	}

	for name, value := range params.Filters {
		switch name {
		case "category", "condition", "availability":
			q = q.Where(name+" = ?", value)
		case "isPublished":
			q = q.Where("is_published = ?", value == "true")
		case "tag":
			// Array containment, which the GIN index serves.
			q = q.Where("tags @> ARRAY[?]::text[]", value)
		case "region":
			q = q.Where("shipping_regions @> ARRAY[?]::text[]", value)
		}
	}
	return q
}

// resolveSort maps the request to a real column, defaulting to the index the
// list path is built around.
func (r *productRepository) resolveSort(params pagination.Params) (string, bool) {
	if params.SortBy == "" {
		return "created_at", true
	}
	return params.SortBy, params.SortDesc
}

// applyKeyset seeks past the cursor.
//
// Only supported on the default ordering: a cursor is only meaningful against
// the sort it was produced for, and silently returning wrong rows for a
// different sort would be worse than refusing.
func (r *productRepository) applyKeyset(
	q *gorm.DB,
	params pagination.Params,
	sortColumn string,
	sortDesc bool,
) (*gorm.DB, error) {
	if sortColumn != "created_at" || !sortDesc {
		return nil, ErrUnsupportedKeyset
	}
	q = q.Order("created_at DESC").Order("id DESC")

	if params.Cursor == "" {
		return q, nil
	}
	createdAt, id, err := decodeCursor(params.Cursor)
	if err != nil {
		return nil, err
	}
	// Row-value comparison, not `created_at < x OR (created_at = x AND id < y)`:
	// the tuple form is what lets Postgres use the composite index directly.
	return q.Where("(created_at, id) < (?, ?)", createdAt, id), nil
}

func (r *productRepository) GetByID(ctx context.Context, id uint64) (*model.Product, error) {
	var product model.Product
	err := r.db.WithContext(ctx).First(&product, id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("get product: %w", err)
	}
	return &product, nil
}

func (r *productRepository) Create(ctx context.Context, product *model.Product) error {
	if err := r.db.WithContext(ctx).Create(product).Error; err != nil {
		if isUniqueViolation(err) {
			return ErrDuplicate
		}
		return fmt.Errorf("create product: %w", err)
	}
	return nil
}

// Update applies a partial patch and returns the stored row.
//
// `Clauses(Returning{})` makes this one round trip instead of an UPDATE
// followed by a SELECT — and, more importantly, the row returned is the one the
// database actually holds, including anything a trigger changed (`updated_at`).
func (r *productRepository) Update(
	ctx context.Context,
	id uint64,
	expectedVersion *uint64,
	patch map[string]any,
) (*model.Product, error) {
	if len(patch) == 0 {
		return r.GetByID(ctx, id)
	}

	var updated []model.Product
	patch["version"] = gorm.Expr("version + 1")
	query := r.db.WithContext(ctx).
		Model(&updated).
		Clauses(clause.Returning{}).
		Where("id = ?", id)
	if expectedVersion != nil {
		query = query.Where("version = ?", *expectedVersion)
	}
	result := query.Updates(patch)

	if result.Error != nil {
		if isUniqueViolation(result.Error) {
			return nil, ErrDuplicate
		}
		return nil, fmt.Errorf("update product: %w", result.Error)
	}
	if result.RowsAffected == 0 || len(updated) == 0 {
		if expectedVersion != nil {
			if _, err := r.GetByID(ctx, id); err == nil {
				return nil, ErrVersionConflict
			} else if !errors.Is(err, ErrNotFound) {
				return nil, err
			}
		}
		return nil, ErrNotFound
	}
	return &updated[0], nil
}

func (r *productRepository) Delete(
	ctx context.Context,
	id uint64,
	expectedVersion *uint64,
) (*model.Product, error) {
	var deleted model.Product
	query := r.db.WithContext(ctx).Clauses(clause.Returning{}).Where("id = ?", id)
	if expectedVersion != nil {
		query = query.Where("version = ?", *expectedVersion)
	}
	result := query.Delete(&deleted)
	if result.Error != nil {
		return nil, fmt.Errorf("delete product: %w", result.Error)
	}
	if result.RowsAffected == 0 {
		if expectedVersion != nil {
			if _, err := r.GetByID(ctx, id); err == nil {
				return nil, ErrVersionConflict
			} else if !errors.Is(err, ErrNotFound) {
				return nil, err
			}
		}
		return nil, ErrNotFound
	}
	return &deleted, nil
}

// isUniqueViolation inspects the typed PostgreSQL error rather than depending
// on driver message text.
func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}

// Cursors are opaque to the client on purpose: encoding them means the format
// can change without breaking a saved link, and it stops anyone treating the
// value as a row id.
func encodeCursor(createdAt time.Time, id uint64) string {
	raw := fmt.Sprintf("%d|%d", createdAt.UnixNano(), id)
	return base64.RawURLEncoding.EncodeToString([]byte(raw))
}

func decodeCursor(cursor string) (time.Time, uint64, error) {
	raw, err := base64.RawURLEncoding.DecodeString(cursor)
	if err != nil {
		return time.Time{}, 0, ErrMalformedCursor
	}
	parts := strings.SplitN(string(raw), "|", 2)
	if len(parts) != 2 {
		return time.Time{}, 0, ErrMalformedCursor
	}
	nanos, err := strconv.ParseInt(parts[0], 10, 64)
	if err != nil {
		return time.Time{}, 0, ErrMalformedCursor
	}
	id, err := strconv.ParseUint(parts[1], 10, 64)
	if err != nil {
		return time.Time{}, 0, ErrMalformedCursor
	}
	return time.Unix(0, nanos), id, nil
}
