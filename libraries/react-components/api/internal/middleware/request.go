package middleware

import (
	"log/slog"
	"runtime/debug"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

const requestIDKey = "request_id"

func RequestID() fiber.Handler {
	return func(c *fiber.Ctx) error {
		requestID := c.Get(fiber.HeaderXRequestID)
		if requestID == "" {
			requestID = uuid.NewString()
		}
		c.Locals(requestIDKey, requestID)
		c.Set(fiber.HeaderXRequestID, requestID)
		return c.Next()
	}
}

func RequestLogger(logger *slog.Logger) fiber.Handler {
	return func(c *fiber.Ctx) error {
		started := time.Now()

		// A handler that returns an error has not yet touched the response,
		// so c.Response().StatusCode() is still the default 200 at this
		// point. Run the app's error handler first — it is what converts the
		// error into its final status and body — so the log records the
		// status the client actually receives. Returning nil afterwards
		// prevents Fiber from invoking the error handler a second time.
		chainErr := c.Next()
		if chainErr != nil {
			if handlerErr := c.App().Config().ErrorHandler(c, chainErr); handlerErr != nil {
				_ = c.SendStatus(fiber.StatusInternalServerError)
			}
		}

		logger.Info(
			"request completed",
			"request_id", c.Locals(requestIDKey),
			"method", c.Method(),
			"path", c.Path(),
			"status", c.Response().StatusCode(),
			"duration_ms", time.Since(started).Milliseconds(),
		)
		return nil
	}
}

func Recover(logger *slog.Logger) fiber.Handler {
	return func(c *fiber.Ctx) (err error) {
		defer func() {
			if recovered := recover(); recovered != nil {
				logger.Error(
					"panic recovered",
					"request_id", c.Locals(requestIDKey),
					"panic", recovered,
					"stack", string(debug.Stack()),
				)
				err = fiber.ErrInternalServerError
			}
		}()
		return c.Next()
	}
}
