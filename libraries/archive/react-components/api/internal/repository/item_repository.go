package repository

import (
	"context"
	"fmt"

	"gorm.io/gorm"

	"github.com/example/idol-promo/api/internal/model"
)

type ItemRepository interface {
	List(context.Context) ([]model.Item, error)
}

type itemRepository struct {
	db *gorm.DB
}

func NewItemRepository(db *gorm.DB) ItemRepository {
	return &itemRepository{db: db}
}

func (r *itemRepository) List(ctx context.Context) ([]model.Item, error) {
	items := make([]model.Item, 0)
	if err := r.db.WithContext(ctx).Order("id ASC").Find(&items).Error; err != nil {
		return nil, fmt.Errorf("list items: %w", err)
	}
	return items, nil
}
