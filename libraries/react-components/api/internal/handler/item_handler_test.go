package handler

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"

	"github.com/example/idol-promo/api/internal/middleware"
	"github.com/example/idol-promo/api/internal/model"
)

type stubRepository struct {
	items []model.Item
	err   error
}

func (s stubRepository) List(context.Context) ([]model.Item, error) {
	return s.items, s.err
}

func TestItemHandlerList(t *testing.T) {
	app := fiber.New()
	itemHandler := NewItemHandler(stubRepository{
		items: []model.Item{{ID: 1, Name: "First item"}},
	}, time.Second)
	app.Get("/api/items", itemHandler.List)

	response, err := app.Test(httptest.NewRequestWithContext(t.Context(), http.MethodGet, "/api/items", http.NoBody))
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	t.Cleanup(func() { _ = response.Body.Close() })
	if response.StatusCode != fiber.StatusOK {
		t.Fatalf("expected status 200, got %d", response.StatusCode)
	}

	var items []model.Item
	if err := json.NewDecoder(response.Body).Decode(&items); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if len(items) != 1 || items[0].Name != "First item" {
		t.Fatalf("unexpected items: %#v", items)
	}
}

func TestItemHandlerListReturnsCentralizedError(t *testing.T) {
	app := fiber.New(fiber.Config{ErrorHandler: middleware.ErrorHandler(discardLogger())})
	itemHandler := NewItemHandler(stubRepository{err: errors.New("database unavailable")}, time.Second)
	app.Get("/api/items", itemHandler.List)

	response, err := app.Test(httptest.NewRequestWithContext(t.Context(), http.MethodGet, "/api/items", http.NoBody))
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	t.Cleanup(func() { _ = response.Body.Close() })
	if response.StatusCode != fiber.StatusInternalServerError {
		t.Fatalf("expected status 500, got %d", response.StatusCode)
	}
}

func discardLogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(io.Discard, nil))
}
