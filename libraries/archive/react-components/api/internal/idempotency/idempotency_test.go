package idempotency

import (
	"bytes"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
)

func TestMultipartFingerprintIgnoresBoundaryAndOriginalFilename(t *testing.T) {
	t.Parallel()
	app := fiber.New()
	app.Post("/", func(c *fiber.Ctx) error {
		value, err := fingerprint(c)
		if err != nil {
			return err
		}
		return c.SendString(value)
	})

	fingerprintFor := func(boundary, filename string) string {
		var body bytes.Buffer
		writer := multipart.NewWriter(&body)
		if err := writer.SetBoundary(boundary); err != nil {
			t.Fatalf("set multipart boundary: %v", err)
		}
		if err := writer.WriteField("productId", "SKU-001"); err != nil {
			t.Fatalf("write field: %v", err)
		}
		file, err := writer.CreateFormFile("productImage", filename)
		if err != nil {
			t.Fatalf("create file field: %v", err)
		}
		_, _ = io.WriteString(file, "same image bytes")
		if closeErr := writer.Close(); closeErr != nil {
			t.Fatalf("close multipart body: %v", closeErr)
		}

		request := httptest.NewRequestWithContext(t.Context(), http.MethodPost, "/", &body)
		request.Header.Set(fiber.HeaderContentType, writer.FormDataContentType())
		response, err := app.Test(request)
		if err != nil {
			t.Fatalf("request: %v", err)
		}
		result, err := io.ReadAll(response.Body)
		if err != nil {
			t.Fatalf("read response: %v", err)
		}
		_ = response.Body.Close()
		return string(result)
	}

	first := fingerprintFor("first-boundary", "first-name.png")
	second := fingerprintFor("second-boundary", "renamed.png")
	if first != second {
		t.Fatalf("equivalent multipart fingerprints differ: %s != %s", first, second)
	}
}
