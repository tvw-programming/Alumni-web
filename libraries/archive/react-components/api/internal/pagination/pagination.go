// Package pagination holds the list-query contract shared by every collection
// endpoint.
//
// It exists so a second table does not reinvent page handling: a repository
// takes a Params and returns a Page, and the handler layer is identical no
// matter what it is listing.
package pagination

import (
	"strconv"
	"strings"
)

const (
	DefaultPageSize = 25
	// MaxPageSize is a ceiling, not a suggestion. Without it `?pageSize=1000000`
	// is an unauthenticated way to make the database do arbitrary work.
	MaxPageSize = 200
)

// Mode selects how a page is located.
type Mode string

const (
	// ModeOffset is LIMIT/OFFSET. Supports "jump to page 40", which a grid's
	// pager needs, at the cost of the database counting past every skipped row.
	ModeOffset Mode = "offset"
	// ModeKeyset seeks past a cursor instead of counting. Constant time at any
	// depth, but only walks forwards.
	ModeKeyset Mode = "keyset"
	// ModeAll returns everything, for exports and small reference tables.
	ModeAll Mode = "all"
)

// Params is a parsed list query.
type Params struct {
	Mode     Mode
	Page     int    // 1-based, offset mode only
	PageSize int    // ignored when Mode is ModeAll
	Cursor   string // opaque, keyset mode only
	Search   string
	SortBy   string
	SortDesc bool
	Filters  map[string]string
	// WithTotal controls whether a COUNT runs. Counting a large filtered table
	// costs as much as the page itself, so a caller that only needs
	// "is there more" can skip it.
	WithTotal bool
}

// Page is one slice of a collection plus what the caller needs to ask for more.
type Page[T any] struct {
	Items []T `json:"items"`
	// Total is nil when it was not requested — deliberately distinct from 0,
	// which means "counted, and there are none".
	Total      *int64 `json:"total"`
	Page       int    `json:"page"`
	PageSize   int    `json:"pageSize"`
	HasMore    bool   `json:"hasMore"`
	NextCursor string `json:"nextCursor,omitempty"`
}

// Query is the minimal interface Parse needs, so it can be used with Fiber,
// net/http, or a test without importing any of them.
type Query interface {
	Get(key string) string
}

// Parse reads list parameters from a query string.
//
// Every value is clamped rather than rejected: a grid sending `page=0` after a
// filter reset should get the first page, not a 400.
func Parse(q Query, allowedSort map[string]string, allowedFilters []string) Params {
	p := Params{
		Mode:      ModeOffset,
		Page:      1,
		PageSize:  DefaultPageSize,
		Filters:   map[string]string{},
		WithTotal: true,
	}

	switch strings.ToLower(q.Get("mode")) {
	case string(ModeAll):
		p.Mode = ModeAll
	case string(ModeKeyset):
		p.Mode = ModeKeyset
	}

	if cursor := q.Get("cursor"); cursor != "" {
		p.Mode = ModeKeyset
		p.Cursor = cursor
	}

	if n, err := strconv.Atoi(q.Get("page")); err == nil && n > 1 {
		p.Page = n
	}
	if n, err := strconv.Atoi(q.Get("pageSize")); err == nil && n > 0 {
		p.PageSize = min(n, MaxPageSize)
	}
	if q.Get("withTotal") == "false" {
		p.WithTotal = false
	}

	p.Search = strings.TrimSpace(q.Get("search"))

	// Sort is whitelisted by mapping an API name to a column name. Interpolating
	// a caller-supplied string into ORDER BY is SQL injection with extra steps,
	// and parameter binding does not work for identifiers.
	if requested := q.Get("sortBy"); requested != "" {
		if column, ok := allowedSort[requested]; ok {
			p.SortBy = column
		}
	}
	p.SortDesc = strings.EqualFold(q.Get("sortDir"), "desc")

	for _, name := range allowedFilters {
		if value := strings.TrimSpace(q.Get(name)); value != "" {
			p.Filters[name] = value
		}
	}

	return p
}

// Offset is the row offset for the current page.
func (p Params) Offset() int {
	if p.Page < 1 {
		return 0
	}
	return (p.Page - 1) * p.PageSize
}
