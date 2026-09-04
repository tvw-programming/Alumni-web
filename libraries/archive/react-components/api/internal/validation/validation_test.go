package validation

import (
	"errors"
	"testing"

	"github.com/example/idol-promo/api/internal/apperror"
)

func TestStructUsesJSONFieldNames(t *testing.T) {
	type request struct {
		EmailAddress string `json:"email" validate:"required,email"`
	}

	err := Struct(request{EmailAddress: "not-email"})
	var appErr *apperror.Error
	if !errors.As(err, &appErr) {
		t.Fatalf("error = %T, want *apperror.Error", err)
	}
	if appErr.Fields["email"] != "must be a valid email address" {
		t.Fatalf("fields = %#v", appErr.Fields)
	}
}
