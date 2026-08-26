package model

import (
	"time"

	"github.com/lib/pq"
	"github.com/shopspring/decimal"
)

// Product mirrors `db/init/003_products.sql`, which in turn mirrors the
// schema-demo form both frontends render.
//
// `decimal.Decimal` for price rather than float64: binary floating point cannot
// represent 19.99, and money that does not add up is the classic version of
// that bug. `pq.StringArray` maps Postgres TEXT[] without a join table.
type Product struct {
	ID uint64 `gorm:"primaryKey;autoIncrement" json:"id"`

	ProductID   string          `gorm:"column:product_id;type:varchar(15);not null;uniqueIndex" json:"productId"`
	ProductName string          `gorm:"column:product_name;type:varchar(100);not null" json:"productName"`
	Description string          `gorm:"type:varchar(500);not null" json:"description"`
	Price       decimal.Decimal `gorm:"type:numeric(12,2);not null" json:"price"`
	Rating      int16           `gorm:"not null;default:0" json:"rating"`

	ProductImagePath     *string        `gorm:"column:product_image_path" json:"productImagePath"`
	ProductDocumentPaths pq.StringArray `gorm:"column:product_document_paths;type:text[]" json:"productDocumentPaths"`

	Comments     *string   `json:"comments"`
	ReleaseDate  time.Time `gorm:"type:date;not null" json:"releaseDate"`
	SupportEmail *string   `gorm:"type:citext" json:"supportEmail"`
	SupportPhone *string   `gorm:"type:varchar(32)" json:"supportPhone"`
	ProductURL   *string   `gorm:"column:product_url" json:"productUrl"`
	ThemeColor   *string   `gorm:"type:varchar(9)" json:"themeColor"`

	Condition       string         `gorm:"type:varchar(16);not null" json:"condition"`
	Availability    string         `gorm:"type:varchar(16);not null;default:inStock" json:"availability"`
	Tags            pq.StringArray `gorm:"type:text[]" json:"tags"`
	ShippingRegions pq.StringArray `gorm:"type:text[];not null" json:"shippingRegions"`

	WarrantyMonths int16  `gorm:"not null;default:0" json:"warrantyMonths"`
	IsPublished    bool   `gorm:"not null;default:false" json:"isPublished"`
	AcceptTerms    bool   `gorm:"not null;default:false" json:"acceptTerms"`
	Category       string `gorm:"type:varchar(32);not null" json:"category"`
	Version        uint64 `gorm:"not null;default:1" json:"version"`

	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

func (Product) TableName() string { return "products" }

// ProductSortColumns whitelists what may reach ORDER BY.
//
// A map rather than a slice because the API name and the column name are
// allowed to differ, and because interpolating a caller-supplied string into
// ORDER BY is SQL injection — parameter binding does not work for identifiers.
const productCategoryField = "category"

var ProductSortColumns = map[string]string{
	"productId":          "product_id",
	"productName":        "product_name",
	"price":              "price",
	"rating":             "rating",
	"releaseDate":        "release_date",
	productCategoryField: productCategoryField,
	"createdAt":          "created_at",
}

// ProductFilters whitelists the query parameters the list endpoint honours.
var ProductFilters = []string{productCategoryField, "condition", "availability", "isPublished", "tag", "region"}
