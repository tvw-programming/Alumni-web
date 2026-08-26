// Package validation turns reusable struct-tag validation into the API's
// stable field-error contract. Domain rules stay in their feature packages.
package validation

import (
	"errors"
	"reflect"
	"strings"

	"github.com/go-playground/validator/v10"

	"github.com/example/idol-promo/api/internal/apperror"
)

var validate = validator.New(validator.WithRequiredStructEnabled())

// Struct validates DTO tags and returns an apperror with JSON field names.
func Struct(value any) error {
	if err := validate.Struct(value); err != nil {
		var validationErrors validator.ValidationErrors
		if !errors.As(err, &validationErrors) {
			return err
		}

		fields := make(map[string]string, len(validationErrors))
		for _, fieldErr := range validationErrors {
			name := jsonFieldName(value, fieldErr.StructField())
			fields[name] = message(fieldErr)
		}
		return apperror.Validation("One or more fields are invalid.", fields)
	}
	return nil
}

func jsonFieldName(value any, structField string) string {
	typeOf := reflect.TypeOf(value)
	for typeOf.Kind() == reflect.Pointer {
		typeOf = typeOf.Elem()
	}
	if field, ok := typeOf.FieldByName(structField); ok {
		if name := strings.Split(field.Tag.Get("json"), ",")[0]; name != "" && name != "-" {
			return name
		}
	}
	return structField
}

func message(fieldErr validator.FieldError) string {
	switch fieldErr.Tag() {
	case "required":
		return "is required"
	case "email":
		return "must be a valid email address"
	case "min":
		return "must contain at least " + fieldErr.Param() + " characters"
	case "max":
		return "must contain at most " + fieldErr.Param() + " characters"
	case "oneof":
		return "must be one of: " + fieldErr.Param()
	default:
		return "is invalid"
	}
}
