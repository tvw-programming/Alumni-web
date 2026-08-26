package handler

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"

	"github.com/gofiber/fiber/v2"

	"github.com/example/idol-promo/api/internal/apperror"
)

func TestParseExpectedVersion(t *testing.T) {
	t.Parallel()

	for _, test := range []struct {
		name       string
		header     string
		want       uint64
		wantStatus int
	}{
		{name: "optional", wantStatus: http.StatusNoContent},
		{name: "quoted", header: `"7"`, want: 7, wantStatus: http.StatusOK},
		{name: "weak", header: `W/"9"`, want: 9, wantStatus: http.StatusOK},
		{name: "malformed", header: "latest", wantStatus: http.StatusBadRequest},
		{name: "zero", header: `"0"`, wantStatus: http.StatusBadRequest},
	} {
		t.Run(test.name, func(t *testing.T) {
			t.Parallel()
			app := fiber.New()
			app.Get("/", func(c *fiber.Ctx) error {
				version, err := parseExpectedVersion(c)
				if err != nil {
					var publicError *apperror.Error
					if !errors.As(err, &publicError) {
						return err
					}
					return c.Status(publicError.Status).SendString(publicError.Code)
				}
				if !version.present {
					return c.SendStatus(http.StatusNoContent)
				}
				return c.SendString(strconv.FormatUint(version.value, 10))
			})

			request := httptest.NewRequestWithContext(t.Context(), http.MethodGet, "/", http.NoBody)
			request.Header.Set(fiber.HeaderIfMatch, test.header)
			response, err := app.Test(request)
			if err != nil {
				t.Fatalf("request: %v", err)
			}
			_ = response.Body.Close()
			if response.StatusCode != test.wantStatus {
				t.Fatalf("status = %d, want %d", response.StatusCode, test.wantStatus)
			}
		})
	}
}
