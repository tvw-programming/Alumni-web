package handler

import (
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/lib/pq"
	"github.com/shopspring/decimal"

	"github.com/example/idol-promo/api/internal/apperror"
	"github.com/example/idol-promo/api/internal/model"
)

// productInput is the write contract, shared by the JSON and multipart paths.
//
// One struct for both is the point: a multipart request decodes into this and
// then follows exactly the same validation and mapping as JSON, so the two
// endpoints cannot drift into accepting different things.
//
// Every field is a pointer so "absent" and "explicitly null/zero" are
// distinguishable — which is what makes PATCH possible without a separate type.
type productInput struct {
	ProductID       *string  `json:"productId"`
	ProductName     *string  `json:"productName"`
	Description     *string  `json:"description"`
	Price           *string  `json:"price"`
	Rating          *int16   `json:"rating"`
	Comments        *string  `json:"comments"`
	ReleaseDate     *string  `json:"releaseDate"`
	SupportEmail    *string  `json:"supportEmail"`
	SupportPhone    *string  `json:"supportPhone"`
	ProductURL      *string  `json:"productUrl"`
	ThemeColor      *string  `json:"themeColor"`
	Condition       *string  `json:"condition"`
	Availability    *string  `json:"availability"`
	Tags            []string `json:"tags"`
	ShippingRegions []string `json:"shippingRegions"`
	WarrantyMonths  *int16   `json:"warrantyMonths"`
	IsPublished     *bool    `json:"isPublished"`
	AcceptTerms     *bool    `json:"acceptTerms"`
	Category        *string  `json:"category"`
}

var (
	validConditions   = map[string]bool{"new": true, "refurbished": true, "used": true}
	validAvailability = map[string]bool{"inStock": true, "preorder": true, "discontinued": true}
	validCategories   = map[string]bool{"electronics": true, "clothing": true, "books": true, "home": true}
)

func invalid(field, message string) *apperror.Error {
	return apperror.Validation(
		fmt.Sprintf("%s: %s", field, message),
		map[string]string{field: message},
	)
}

// toModel validates and converts. `partial` relaxes the required checks so the
// same routine serves both create and update.
//
// The database re-checks all of this. That is not duplication: this layer
// produces a readable message naming the field, the constraint guarantees the
// rule holds even for a writer that bypasses this code.
func (in productInput) toModel(partial bool) (*model.Product, map[string]any, error) {
	patch := map[string]any{}
	product := &model.Product{}

	requireString := func(name string, value *string, target *string, column string) error {
		if value == nil {
			if partial {
				return nil
			}
			return invalid(name, "is required")
		}
		trimmed := strings.TrimSpace(*value)
		if trimmed == "" && !partial {
			return invalid(name, "is required")
		}
		*target = trimmed
		patch[column] = trimmed
		return nil
	}

	if err := requireString("productId", in.ProductID, &product.ProductID, "product_id"); err != nil {
		return nil, nil, err
	}
	if l := len(product.ProductID); in.ProductID != nil && (l < 3 || l > 15) {
		return nil, nil, invalid("productId", "must be 3–15 characters")
	}
	if err := requireString("productName", in.ProductName, &product.ProductName, "product_name"); err != nil {
		return nil, nil, err
	}
	if err := requireString("description", in.Description, &product.Description, "description"); err != nil {
		return nil, nil, err
	}
	if len(product.Description) > 500 {
		return nil, nil, invalid("description", "must be at most 500 characters")
	}

	if in.Price != nil {
		price, err := decimal.NewFromString(strings.TrimSpace(*in.Price))
		if err != nil {
			return nil, nil, invalid("price", "must be a number")
		}
		if price.IsNegative() {
			return nil, nil, invalid("price", "must not be negative")
		}
		product.Price = price
		patch["price"] = price
	} else if !partial {
		return nil, nil, invalid("price", "is required")
	}

	if in.Rating != nil {
		if *in.Rating < 0 || *in.Rating > 5 {
			return nil, nil, invalid("rating", "must be between 0 and 5")
		}
		product.Rating = *in.Rating
		patch["rating"] = *in.Rating
	}

	if in.ReleaseDate != nil {
		parsed, err := time.Parse("2006-01-02", strings.TrimSpace(*in.ReleaseDate))
		if err != nil {
			return nil, nil, invalid("releaseDate", "must be YYYY-MM-DD")
		}
		product.ReleaseDate = parsed
		patch["release_date"] = parsed
	} else if !partial {
		return nil, nil, invalid("releaseDate", "is required")
	}

	optional := func(value *string, target **string, column string) {
		if value == nil {
			return
		}
		trimmed := strings.TrimSpace(*value)
		if trimmed == "" {
			*target = nil
			patch[column] = nil
			return
		}
		*target = &trimmed
		patch[column] = trimmed
	}
	optional(in.Comments, &product.Comments, "comments")
	optional(in.SupportEmail, &product.SupportEmail, "support_email")
	optional(in.SupportPhone, &product.SupportPhone, "support_phone")
	optional(in.ProductURL, &product.ProductURL, "product_url")
	optional(in.ThemeColor, &product.ThemeColor, "theme_color")

	enum := func(name string, value *string, allowed map[string]bool, target *string, column string, required bool) error {
		if value == nil {
			if required && !partial {
				return invalid(name, "is required")
			}
			return nil
		}
		v := strings.TrimSpace(*value)
		if !allowed[v] {
			return invalid(name, "is not one of the permitted values")
		}
		*target = v
		patch[column] = v
		return nil
	}
	if err := enum("condition", in.Condition, validConditions, &product.Condition, "condition", true); err != nil {
		return nil, nil, err
	}
	if err := enum("availability", in.Availability, validAvailability, &product.Availability, "availability", false); err != nil {
		return nil, nil, err
	}
	if err := enum("category", in.Category, validCategories, &product.Category, "category", true); err != nil {
		return nil, nil, err
	}
	if product.Availability == "" {
		product.Availability = "inStock"
	}

	// Initialised to an empty array, never left nil. A nil slice is sent to
	// Postgres as an explicit NULL, which the column's `NOT NULL DEFAULT '{}'`
	// rejects — a DEFAULT only applies when the column is omitted entirely.
	product.Tags = pq.StringArray{}
	product.ProductDocumentPaths = pq.StringArray{}

	if in.Tags != nil {
		product.Tags = pq.StringArray(in.Tags)
		patch["tags"] = pq.StringArray(in.Tags)
	}

	if in.ShippingRegions != nil {
		if len(in.ShippingRegions) == 0 && !partial {
			return nil, nil, invalid("shippingRegions", "select at least one region")
		}
		product.ShippingRegions = pq.StringArray(in.ShippingRegions)
		patch["shipping_regions"] = pq.StringArray(in.ShippingRegions)
	} else if !partial {
		return nil, nil, invalid("shippingRegions", "select at least one region")
	}

	if in.WarrantyMonths != nil {
		if *in.WarrantyMonths < 0 || *in.WarrantyMonths > 120 {
			return nil, nil, invalid("warrantyMonths", "must be between 0 and 120")
		}
		product.WarrantyMonths = *in.WarrantyMonths
		patch["warranty_months"] = *in.WarrantyMonths
	}
	if in.IsPublished != nil {
		product.IsPublished = *in.IsPublished
		patch["is_published"] = *in.IsPublished
	}

	// Required on create and never silently defaulted: the form asks the user to
	// accept terms, so a row that never did is a bug, not a state to handle.
	if in.AcceptTerms != nil {
		product.AcceptTerms = *in.AcceptTerms
	}
	if !partial && !product.AcceptTerms {
		return nil, nil, invalid("acceptTerms", "must be accepted")
	}
	if in.AcceptTerms != nil {
		patch["accept_terms"] = *in.AcceptTerms
	}

	return product, patch, nil
}

/*
fromForm decodes a multipart form into the same input struct.

Only keys actually present are populated, which is what preserves the
absent-vs-empty distinction that makes PATCH work. Everything after this point
is shared with the JSON path.
*/
func fromForm(get func(string) string, has func(string) bool, getAll func(string) []string) productInput {
	in := productInput{}

	str := func(key string) *string {
		if !has(key) {
			return nil
		}
		v := get(key)
		return &v
	}
	in.ProductID = str("productId")
	in.ProductName = str("productName")
	in.Description = str("description")
	in.Price = str("price")
	in.Comments = str("comments")
	in.ReleaseDate = str("releaseDate")
	in.SupportEmail = str("supportEmail")
	in.SupportPhone = str("supportPhone")
	in.ProductURL = str("productUrl")
	in.ThemeColor = str("themeColor")
	in.Condition = str("condition")
	in.Availability = str("availability")
	in.Category = str("category")

	if has("rating") {
		if n, err := strconv.ParseInt(get("rating"), 10, 16); err == nil {
			v := int16(n)
			in.Rating = &v
		}
	}
	if has("warrantyMonths") {
		if n, err := strconv.ParseInt(get("warrantyMonths"), 10, 16); err == nil {
			v := int16(n)
			in.WarrantyMonths = &v
		}
	}
	boolean := func(key string) *bool {
		if !has(key) {
			return nil
		}
		v := get(key) == "true" || get(key) == "on" || get(key) == "1"
		return &v
	}
	in.IsPublished = boolean("isPublished")
	in.AcceptTerms = boolean("acceptTerms")

	// Repeated keys are the HTML-native way to send a list, and it is what a
	// checkbox group posts. A comma-joined single value is accepted too, because
	// that is what a hand-rolled client tends to send.
	multi := func(key string) []string {
		values := getAll(key)
		if len(values) == 0 {
			return nil
		}
		if len(values) == 1 && strings.Contains(values[0], ",") {
			parts := strings.Split(values[0], ",")
			out := make([]string, 0, len(parts))
			for _, p := range parts {
				if trimmed := strings.TrimSpace(p); trimmed != "" {
					out = append(out, trimmed)
				}
			}
			return out
		}
		return values
	}
	in.Tags = multi("tags")
	in.ShippingRegions = multi("shippingRegions")

	return in
}
