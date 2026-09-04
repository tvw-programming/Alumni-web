package handler

import (
	"context"
	"log/slog"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"

	"github.com/example/idol-promo/api/internal/model"
	"github.com/example/idol-promo/api/internal/repository"
)

const auditResourceIDKey = "audit.resource_id"

// AuditMutation records successful protected mutations. Audit failure is
// logged but cannot turn an already-completed business mutation into a false
// failure response.
func AuditMutation(
	repo repository.AuditRepository,
	logger *slog.Logger,
	timeout time.Duration,
	action, resourceType string,
) fiber.Handler {
	return func(c *fiber.Ctx) error {
		if err := c.Next(); err != nil {
			return err
		}
		if c.Response().StatusCode() < 200 || c.Response().StatusCode() >= 300 {
			return nil
		}

		var actorID *uint64
		if claims, ok := ClaimsFrom(c); ok {
			id := claims.UserID
			actorID = &id
		}
		var resourceID *string
		if id := c.Params("id"); id != "" {
			resourceID = &id
		} else if id, ok := c.Locals(auditResourceIDKey).(uint64); ok {
			formatted := strconv.FormatUint(id, 10)
			resourceID = &formatted
		}
		var requestID *string
		if id := c.GetRespHeader(fiber.HeaderXRequestID); id != "" {
			requestID = &id
		}

		ctx, cancel := context.WithTimeout(c.UserContext(), timeout)
		defer cancel()
		if err := repo.Record(ctx, &model.AuditEvent{
			ActorUserID:  actorID,
			Action:       action,
			ResourceType: resourceType,
			ResourceID:   resourceID,
			RequestID:    requestID,
			IPAddress:    c.IP(),
			Metadata: map[string]any{
				"method":          c.Method(),
				"path":            c.Path(),
				responseStatusKey: c.Response().StatusCode(),
			},
		}); err != nil {
			logger.Error("audit event failed", "request_id", requestID, "error", err)
		}
		return nil
	}
}
