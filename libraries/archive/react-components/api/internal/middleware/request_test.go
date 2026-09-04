package middleware

import (
	"bytes"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
)

// A handler that returns an error leaves the response status untouched, so a
// logger that reads it before the global error handler runs reports 200 for a
// request the client saw fail.
func TestRequestLoggerLogsFinalStatusForFailedRequests(t *testing.T) {
	var logs bytes.Buffer
	logger := slog.New(slog.NewJSONHandler(&logs, nil))

	app := fiber.New(fiber.Config{ErrorHandler: ErrorHandler(logger)})
	app.Use(RequestID())
	app.Use(RequestLogger(logger))
	app.Get("/boom", func(*fiber.Ctx) error {
		return fiber.ErrNotFound
	})

	response, err := app.Test(httptest.NewRequestWithContext(t.Context(), http.MethodGet, "/boom", http.NoBody))
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	t.Cleanup(func() { _ = response.Body.Close() })
	if response.StatusCode != fiber.StatusNotFound {
		t.Fatalf("expected status 404, got %d", response.StatusCode)
	}

	entry := findLogEntry(t, logs.Bytes(), "request completed")
	if status, ok := entry["status"].(float64); !ok || int(status) != fiber.StatusNotFound {
		t.Fatalf("expected logged status 404, got %v", entry["status"])
	}
	if entry["request_id"] == "" || entry["request_id"] == nil {
		t.Fatal("expected the completion log to carry a request_id")
	}
}

func TestRequestLoggerLogsSuccessfulStatus(t *testing.T) {
	var logs bytes.Buffer
	logger := slog.New(slog.NewJSONHandler(&logs, nil))

	app := fiber.New(fiber.Config{ErrorHandler: ErrorHandler(logger)})
	app.Use(RequestID())
	app.Use(RequestLogger(logger))
	app.Get("/ok", func(c *fiber.Ctx) error {
		return c.SendStatus(fiber.StatusCreated)
	})

	response, err := app.Test(httptest.NewRequestWithContext(t.Context(), http.MethodGet, "/ok", http.NoBody))
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	t.Cleanup(func() { _ = response.Body.Close() })
	if response.StatusCode != fiber.StatusCreated {
		t.Fatalf("expected status 201, got %d", response.StatusCode)
	}

	entry := findLogEntry(t, logs.Bytes(), "request completed")
	if status, ok := entry["status"].(float64); !ok || int(status) != fiber.StatusCreated {
		t.Fatalf("expected logged status 201, got %v", entry["status"])
	}
}

func findLogEntry(t *testing.T, raw []byte, message string) map[string]any {
	t.Helper()

	for _, line := range bytes.Split(bytes.TrimSpace(raw), []byte("\n")) {
		if len(line) == 0 {
			continue
		}
		entry := map[string]any{}
		if err := json.Unmarshal(line, &entry); err != nil {
			t.Fatalf("log line is not JSON: %s", line)
		}
		if entry["msg"] == message {
			return entry
		}
	}

	t.Fatalf("no %q log entry in:\n%s", message, raw)
	return nil
}
