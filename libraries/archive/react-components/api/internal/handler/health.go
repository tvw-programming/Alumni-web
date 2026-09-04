package handler

import (
	"context"
	"database/sql"
	"time"

	"github.com/gofiber/fiber/v2"

	"github.com/example/idol-promo/api/internal/apperror"
)

const responseStatusKey = "status"

func Health(db *sql.DB, timeout time.Duration) fiber.Handler {
	return func(c *fiber.Ctx) error {
		ctx, cancel := context.WithTimeout(c.UserContext(), timeout)
		defer cancel()

		if err := db.PingContext(ctx); err != nil {
			return apperror.New(
				fiber.StatusServiceUnavailable,
				"DATABASE_UNAVAILABLE",
				"Database health check failed",
				err,
			)
		}
		return c.JSON(fiber.Map{responseStatusKey: "ok"})
	}
}

func Live(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{responseStatusKey: "ok"})
}

func Startup(ready func() bool) fiber.Handler {
	return func(c *fiber.Ctx) error {
		if !ready() {
			return apperror.New(
				fiber.StatusServiceUnavailable,
				"STARTING",
				"Application startup is not complete",
				nil,
			)
		}
		return c.JSON(fiber.Map{responseStatusKey: "ok"})
	}
}
