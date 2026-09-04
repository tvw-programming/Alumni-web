package pagination

import "testing"

type query map[string]string

func (q query) Get(key string) string { return q[key] }

var sortable = map[string]string{"price": "price", "createdAt": "created_at"}

func TestParseDefaults(t *testing.T) {
	p := Parse(query{}, sortable, nil)
	if p.Mode != ModeOffset || p.Page != 1 || p.PageSize != DefaultPageSize || !p.WithTotal {
		t.Fatalf("unexpected defaults: %+v", p)
	}
}

func TestPageSizeIsClamped(t *testing.T) {
	// Without a ceiling, `?pageSize=1000000` is a way to make the database do
	// arbitrary work on request.
	if got := Parse(query{"pageSize": "999999"}, sortable, nil).PageSize; got != MaxPageSize {
		t.Errorf("pageSize = %d, want %d", got, MaxPageSize)
	}
}

func TestNonsenseValuesFallBackRatherThanFail(t *testing.T) {
	// A grid resetting a filter can legitimately send page=0.
	for _, q := range []query{{"page": "0"}, {"page": "-3"}, {"page": "abc"}, {"pageSize": "0"}} {
		p := Parse(q, sortable, nil)
		if p.Page < 1 || p.PageSize < 1 {
			t.Errorf("Parse(%v) produced %+v", q, p)
		}
	}
}

func TestSortIsWhitelisted(t *testing.T) {
	// Interpolating a caller-supplied string into ORDER BY is SQL injection,
	// and parameter binding does not work for identifiers — so anything not on
	// the list must be dropped, not passed through.
	if got := Parse(query{"sortBy": "price"}, sortable, nil).SortBy; got != "price" {
		t.Errorf("allowed sort dropped: %q", got)
	}
	for _, evil := range []string{"id; DROP TABLE products", "password_hash", "(SELECT 1)"} {
		if got := Parse(query{"sortBy": evil}, sortable, nil).SortBy; got != "" {
			t.Errorf("Parse(sortBy=%q) leaked %q", evil, got)
		}
	}
}

func TestFiltersAreWhitelisted(t *testing.T) {
	p := Parse(query{"category": "books", "secret": "x"}, sortable, []string{"category"})
	if p.Filters["category"] != "books" {
		t.Error("allowed filter dropped")
	}
	if _, present := p.Filters["secret"]; present {
		t.Error("unlisted filter accepted")
	}
}

func TestCursorImpliesKeyset(t *testing.T) {
	// A caller that has a cursor is paging forwards, whatever `mode` says.
	if p := Parse(query{"cursor": "abc"}, sortable, nil); p.Mode != ModeKeyset {
		t.Errorf("mode = %q, want keyset", p.Mode)
	}
}

func TestOffset(t *testing.T) {
	for _, tc := range []struct{ page, size, want int }{{1, 25, 0}, {2, 25, 25}, {4, 10, 30}, {0, 25, 0}} {
		p := Params{Page: tc.page, PageSize: tc.size}
		if got := p.Offset(); got != tc.want {
			t.Errorf("page %d size %d: offset = %d, want %d", tc.page, tc.size, got, tc.want)
		}
	}
}

func TestWithTotalOptOut(t *testing.T) {
	// Counting a filtered table costs about as much as the page; an infinite
	// scroll never needs it.
	if Parse(query{"withTotal": "false"}, sortable, nil).WithTotal {
		t.Error("withTotal=false ignored")
	}
}
