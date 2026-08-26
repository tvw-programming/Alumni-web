package database

import (
	"bytes"
	"errors"
	"log/slog"
	"strings"
	"testing"
	"time"

	"gorm.io/gorm"
)

func TestGORMLoggerIgnoresNotFoundAndOmitsSQL(t *testing.T) {
	t.Parallel()
	var output bytes.Buffer
	logger := newGORMLogger(slog.New(slog.NewJSONHandler(&output, nil)))
	query := func() (string, int64) { return "SELECT 'secret-value'", 0 }

	logger.Trace(t.Context(), time.Now(), query, gorm.ErrRecordNotFound)
	if output.Len() != 0 {
		t.Fatalf("record-not-found produced a log: %s", output.String())
	}

	logger.Trace(t.Context(), time.Now(), query, errors.New("database unavailable"))
	if strings.Contains(output.String(), "secret-value") {
		t.Fatalf("database log exposed SQL: %s", output.String())
	}
	if !strings.Contains(output.String(), "database unavailable") {
		t.Fatalf("database error is missing from log: %s", output.String())
	}
}
