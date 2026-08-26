package middleware

import (
	"errors"
	"log/slog"

	"github.com/gofiber/fiber/v2"

	"github.com/example/idol-promo/api/internal/apperror"
)

type errorResponse struct {
	Error errorBody `json:"error"`
}

type errorBody struct {
	Code      string            `json:"code"`
	Message   string            `json:"message"`
	RequestID string            `json:"requestId,omitempty"`
	Fields    map[string]string `json:"fields,omitempty"`
}

func ErrorHandler(logger *slog.Logger) fiber.ErrorHandler {
	return func(c *fiber.Ctx, err error) error {
		status := fiber.StatusInternalServerError
		code := "INTERNAL_ERROR"
		message := "An unexpected error occurred"
		var fields map[string]string

		var appErr *apperror.Error
		var fiberErr *fiber.Error
		switch {
		case errors.As(err, &appErr):
			status = appErr.Status
			code = appErr.Code
			message = appErr.Message
			fields = appErr.Fields
		case errors.As(err, &fiberErr):
			status = fiberErr.Code
			code = fiberErrorCode(status)
			message = fiberErr.Message
		}

		requestID, _ := c.Locals(requestIDKey).(string)
		if status >= fiber.StatusInternalServerError {
			logger.Error("request failed", "request_id", requestID, "status", status, "error", err)
		}

		return c.Status(status).JSON(errorResponse{
			Error: errorBody{Code: code, Message: message, RequestID: requestID, Fields: fields},
		})
	}
}

func fiberErrorCode(status int) string {
	switch status {
	case fiber.StatusNotFound:
		return "NOT_FOUND"
	case fiber.StatusMethodNotAllowed:
		return "METHOD_NOT_ALLOWED"
	case fiber.StatusBadRequest:
		return "BAD_REQUEST"
	default:
		return "REQUEST_ERROR"
	}
}
