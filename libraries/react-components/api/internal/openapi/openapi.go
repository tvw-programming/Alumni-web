// Package openapi embeds and serves the API contract through Swagger UI.
package openapi

import (
	_ "embed"

	"github.com/gofiber/contrib/swagger"
	"github.com/gofiber/fiber/v2"
)

//go:embed openapi.yaml
var specification []byte

func Handler() fiber.Handler {
	return swagger.New(swagger.Config{
		BasePath:    "/api",
		Path:        "docs",
		FilePath:    "openapi.yaml",
		FileContent: specification,
		Title:       "Idol Promo API documentation",
		CacheAge:    300,
	})
}
