// Package migrations applies the versioned PostgreSQL schema embedded in the
// API binary. It runs before repositories are constructed.
package migrations

import (
	"context"
	"database/sql"
	"embed"
	"errors"
	"fmt"

	"github.com/golang-migrate/migrate/v4"
	postgresmigrate "github.com/golang-migrate/migrate/v4/database/postgres"
	"github.com/golang-migrate/migrate/v4/source/iofs"
)

//go:embed sql/*.sql
var files embed.FS

func Apply(db *sql.DB) error {
	source, err := iofs.New(files, "sql")
	if err != nil {
		return fmt.Errorf("open embedded migrations: %w", err)
	}
	connection, err := db.Conn(context.Background())
	if err != nil {
		return fmt.Errorf("reserve migration connection: %w", err)
	}
	driver, err := postgresmigrate.WithConnection(
		context.Background(), connection, &postgresmigrate.Config{})
	if err != nil {
		_ = connection.Close()
		return fmt.Errorf("create migration driver: %w", err)
	}
	runner, err := migrate.NewWithInstance("iofs", source, "postgres", driver)
	if err != nil {
		_ = driver.Close()
		return fmt.Errorf("create migration runner: %w", err)
	}
	applyErr := runner.Up()
	sourceErr, databaseErr := runner.Close()
	if applyErr != nil && !errors.Is(applyErr, migrate.ErrNoChange) {
		return fmt.Errorf("apply migrations: %w", applyErr)
	}
	if sourceErr != nil || databaseErr != nil {
		return fmt.Errorf("close migration runner: %w", errors.Join(sourceErr, databaseErr))
	}
	return nil
}
