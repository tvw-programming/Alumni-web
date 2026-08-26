package database

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"gorm.io/gorm"
	gormlogger "gorm.io/gorm/logger"
)

const slowQueryThreshold = 200 * time.Millisecond

// gormLogger keeps database diagnostics in the same structured logger as the
// HTTP lifecycle. SQL text is intentionally omitted because interpolated
// statements can contain credentials or other personal data.
type gormLogger struct {
	logger *slog.Logger
	level  gormlogger.LogLevel
}

func newGORMLogger(logger *slog.Logger) gormlogger.Interface {
	return &gormLogger{logger: logger, level: gormlogger.Warn}
}

func (l *gormLogger) LogMode(level gormlogger.LogLevel) gormlogger.Interface {
	clone := *l
	clone.level = level
	return &clone
}

func (l *gormLogger) Info(_ context.Context, message string, data ...any) {
	if l.level >= gormlogger.Info {
		l.logger.Info(fmt.Sprintf(message, data...))
	}
}

func (l *gormLogger) Warn(_ context.Context, message string, data ...any) {
	if l.level >= gormlogger.Warn {
		l.logger.Warn(fmt.Sprintf(message, data...))
	}
}

func (l *gormLogger) Error(_ context.Context, message string, data ...any) {
	if l.level >= gormlogger.Error {
		l.logger.Error(fmt.Sprintf(message, data...))
	}
}

func (l *gormLogger) Trace(
	_ context.Context,
	started time.Time,
	query func() (sql string, rowsAffected int64),
	err error,
) {
	elapsed := time.Since(started)
	switch {
	case err != nil && !errors.Is(err, gorm.ErrRecordNotFound) && l.level >= gormlogger.Error:
		_, rows := query()
		l.logger.Error("database query failed", "duration_ms", elapsed.Milliseconds(),
			"rows", rows, "error", err)
	case elapsed > slowQueryThreshold && l.level >= gormlogger.Warn:
		_, rows := query()
		l.logger.Warn("slow database query", "duration_ms", elapsed.Milliseconds(), "rows", rows)
	case l.level >= gormlogger.Info:
		_, rows := query()
		l.logger.Info("database query completed", "duration_ms", elapsed.Milliseconds(), "rows", rows)
	}
}
