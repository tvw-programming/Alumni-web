package handler

import (
	"context"
	"time"

	"github.com/gofiber/fiber/v2"

	"github.com/example/idol-promo/api/internal/apperror"
	"github.com/example/idol-promo/api/internal/repository"
)

type ItemHandler struct {
	repository repository.ItemRepository
	timeout    time.Duration
}

func NewItemHandler(repo repository.ItemRepository, timeout time.Duration) *ItemHandler {
	return &ItemHandler{repository: repo, timeout: timeout}
}

func (h *ItemHandler) List(c *fiber.Ctx) error {
	ctx, cancel := context.WithTimeout(c.UserContext(), h.timeout)
	defer cancel()

	items, err := h.repository.List(ctx)
	if err != nil {
		return apperror.New(
			fiber.StatusInternalServerError,
			"DATABASE_ERROR",
			"Unable to retrieve items",
			err,
		)
	}

	return c.Status(fiber.StatusOK).JSON(items)
}
