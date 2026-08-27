// Package migrate applies db/migrations/*.up.sql in order, once each.
//
// Hand-rolled rather than golang-migrate: the whole job is "run these files in
// order and remember which ran", and a dependency that also wants a driver, a
// CLI and a source abstraction is more surface than the job needs. The sibling
// API uses golang-migrate; if this service ever grows to that size, switch.
package migrate

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Run applies every unapplied .up.sql file, each in its own transaction, so a
// failure halfway leaves the earlier ones applied and the failing one absent
// rather than half-written.
func Run(ctx context.Context, pool *pgxpool.Pool, dir string) ([]string, error) {
	if _, err := pool.Exec(ctx, `
CREATE TABLE IF NOT EXISTS schema_migrations (
    version    TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`); err != nil {
		return nil, fmt.Errorf("creating schema_migrations: %w", err)
	}

	entries, err := filepath.Glob(filepath.Join(dir, "*.up.sql"))
	if err != nil {
		return nil, err
	}
	sort.Strings(entries)

	var applied []string
	for _, path := range entries {
		version := strings.TrimSuffix(filepath.Base(path), ".up.sql")

		var exists bool
		if err := pool.QueryRow(ctx,
			`SELECT EXISTS (SELECT 1 FROM schema_migrations WHERE version = $1)`,
			version).Scan(&exists); err != nil {
			return nil, err
		}
		if exists {
			continue
		}

		body, err := os.ReadFile(path)
		if err != nil {
			return nil, err
		}

		tx, err := pool.Begin(ctx)
		if err != nil {
			return nil, err
		}
		if _, err := tx.Exec(ctx, string(body)); err != nil {
			_ = tx.Rollback(ctx)
			return applied, fmt.Errorf("migration %s: %w", version, err)
		}
		if _, err := tx.Exec(ctx,
			`INSERT INTO schema_migrations (version) VALUES ($1)`, version); err != nil {
			_ = tx.Rollback(ctx)
			return applied, err
		}
		if err := tx.Commit(ctx); err != nil {
			return applied, err
		}
		applied = append(applied, version)
	}
	return applied, nil
}
