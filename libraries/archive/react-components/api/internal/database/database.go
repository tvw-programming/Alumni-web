package database

import (
	"context"
	"database/sql"
	"fmt"
	"log/slog"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	"github.com/example/idol-promo/api/internal/config"
)

const (
	maxOpenAttempts = 10
	pingTimeout     = 5 * time.Second
)

func Open(cfg config.DatabaseConfig, logger *slog.Logger) (*gorm.DB, *sql.DB, error) {
	dsn := fmt.Sprintf(
		"host=%s port=%d user=%s password=%s dbname=%s sslmode=%s TimeZone=UTC",
		cfg.Host, cfg.Port, cfg.User, cfg.Password, cfg.Name, cfg.SSLMode,
	)

	var db *gorm.DB
	var err error
	for attempt := 1; attempt <= maxOpenAttempts; attempt++ {
		db, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
			Logger: newGORMLogger(logger),
		})
		if err == nil {
			break
		}
		if attempt == maxOpenAttempts {
			return nil, nil, fmt.Errorf("open postgres after %d attempts: %w", attempt, err)
		}
		time.Sleep(time.Duration(attempt) * time.Second)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, nil, fmt.Errorf("get connection pool: %w", err)
	}
	sqlDB.SetMaxOpenConns(cfg.MaxOpenConns)
	sqlDB.SetMaxIdleConns(cfg.MaxIdleConns)
	sqlDB.SetConnMaxLifetime(cfg.ConnMaxLifetime)
	sqlDB.SetConnMaxIdleTime(5 * time.Minute)

	// Bounded: an unreachable-but-not-refusing database would otherwise hang
	// startup indefinitely, and the container never reports unhealthy.
	pingCtx, cancel := context.WithTimeout(context.Background(), pingTimeout)
	defer cancel()

	if err := sqlDB.PingContext(pingCtx); err != nil {
		_ = sqlDB.Close()
		return nil, nil, fmt.Errorf("ping postgres: %w", err)
	}

	return db, sqlDB, nil
}
