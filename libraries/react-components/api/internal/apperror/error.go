package apperror

import "fmt"

type Error struct {
	Status  int
	Code    string
	Message string
	Fields  map[string]string
	Err     error
}

func (e *Error) Error() string {
	if e.Err == nil {
		return e.Message
	}
	return fmt.Sprintf("%s: %v", e.Message, e.Err)
}

func (e *Error) Unwrap() error {
	return e.Err
}

func New(status int, code, message string, err error) *Error {
	return &Error{Status: status, Code: code, Message: message, Err: err}
}

// Validation creates a stable field-error response without coupling the
// validation layer to Fiber's response types.
func Validation(message string, fields map[string]string) *Error {
	return &Error{
		Status:  422,
		Code:    "VALIDATION_FAILED",
		Message: message,
		Fields:  fields,
	}
}
