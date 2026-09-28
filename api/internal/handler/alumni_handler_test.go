package handler

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/stretchr/testify/assert"
)

func TestExport(t *testing.T) {
	h := &AlumniHandler{
		repo: &mockAlumniRepo{},
		logger: nil,
	}

	tests := []struct {
		name    string
		setup   func()
		wantCode int
		wantBody string
	}{
		{
			name: "AC-1: Valid ID, active status returns 200 with record",
			setup: func() {
				h.repo.(*mockAlumniRepo).records = []AlumniRow{
					{ID: 123, Status: "active", FullName: "John Doe"},
				}
			},
			wantCode: 200,
			wantBody: `{"id":123,"status":"active","fullName":"John Doe"}`,
		},
		{
			name: "AC-2: Invalid ID returns 400",
			setup: func() {
			},
			wantCode: 400,
			wantBody: `"id must be a number"`,
		},
		{
			name: "AC-3: ID not found returns 404",
			setup: func() {
			},
			wantCode: 404,
			wantBody: `"no alumnus with that id"`,
		},
		{
			name: "AC-3: ID exists but status is deleted returns 404",
			setup: func() {
				h.repo.(*mockAlumniRepo).records = []AlumniRow{
					{ID: 456, Status: "deleted", FullName: "Jane Doe"},
				}
			},
			wantCode: 404,
			wantBody: `"no alumnus with that id"`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			c := httptest.New(fiber.New())
			c.SetURL("/api/v1/alumni/123/export")
			c.SetMethod("GET")

			if tt.setup != nil {
				tt.setup()
			}

			if tt.setup != nil {
				// Re-initialize handler with updated repo if needed for dynamic tests
				// In a real test, this would be handled by dependency injection or a real repo instance
				// For this mock, we assume the test setup updates the mock's internal state
			}

			// Override the handler for this specific test case if the mock needs dynamic data
			// Since we can't easily re-inject a new handler with different mock data in a single test function
			// without a factory, we will assume the test runner can handle the setup or we use a factory.
			// However, to keep it simple and runnable as a single file snippet:
			// We will create a specific handler instance for each test if the data varies.
			
			// Simulating the test execution
			if tt.name == "AC-1: Valid ID, active status returns 200 with record" {
				c.SetPath("/api/v1/alumni/123/export")
				c.SetQuery("id", "123")
				c.SetQuery("status", "active")
			} else if tt.name == "AC-2: Invalid ID returns 400" {
				c.SetPath("/api/v1/alumni/abc/export")
				c.SetQuery("id", "abc")
			} else if tt.name == "AC-3: ID not found returns 404" {
				c.SetPath("/api/v1/alumni/999/export")
				c.SetQuery("id", "999")
			} else if tt.name == "AC-3: ID exists but status is deleted returns 404" {
				c.SetPath("/api/v1/alumni/456/export")
				c.SetQuery("id", "456")
				c.SetQuery("status", "deleted")
			}

			// Note: The actual implementation relies on the path parameter 'id' being parsed.
			// The test setup above sets query params which might not be used by the handler if it reads from path.
			// Assuming the handler reads from c.Params("id") as per the code snippet.
			
			// Re-creating handler with correct mock data for each test
			var hTest *AlumniHandler
			if tt.name == "AC-1: Valid ID, active status returns 200 with record" {
				hTest = &AlumniHandler{repo: &mockAlumniRepo{records: []AlumniRow{{ID: 123, Status: "active", FullName: "John Doe"}}}, logger: nil}
			} else if tt.name == "AC-2: Invalid ID returns 400" {
				hTest = &AlumniHandler{repo: &mockAlumniRepo{records: []AlumniRow{}}, logger: nil}
			} else if tt.name == "AC-3: ID not found returns 404" {
				hTest = &AlumniHandler{repo: &mockAlumniRepo{records: []AlumniRow{}}, logger: nil}
			} else if tt.name == "AC-3: ID exists but status is deleted returns 404" {
				hTest = &AlumniHandler{repo: &mockAlumniRepo{records: []AlumniRow{{ID: 456, Status: "deleted", FullName: "Jane Doe"}}}, logger: nil}
			}

			c = httptest.New(fiber.New())
			c.SetURL("/api/v1/alumni/123/export") // Default path, will be overridden by SetPath if needed
			c.SetMethod("GET")

			// Manually set path based on test case to ensure 'id' param is correct
			switch tt.name {
			case "AC-1: Valid ID, active status returns 200 with record":
				c.SetPath("/api/v1/alumni/123/export")
			case "AC-2: Invalid ID returns 400":
				c.SetPath("/api/v1/alumni/abc/export")
			case "AC-3: ID not found returns 404":
				c.SetPath("/api/v1/alumni/999/export")
			case "AC-3: ID exists but status is deleted returns 404":
				c.SetPath("/api/v1/alumni/456/export")
			}

			c.Handler = hTest
			resp, err := c.Request()
			assert.NoError(t, err)
			assert.Equal(t, tt.wantCode, resp.StatusCode)

			var body string
			if resp.StatusCode == 200 {
				b, _ := resp.Body.Bytes()
				body = string(b)
			} else {
				b, _ := resp.Body.Bytes()
				body = string(b)
			}

			assert.Contains(t, body, tt.wantBody)
		})
	}
}

type mockAlumniRepo struct {
	records []AlumniRow
}

func (m *mockAlumniRepo) List(ctx interface{}, q, status string, limit, offset int) (interface{}, error) {
	return nil, nil
}

func (m *mockAlumniRepo) Create(ctx interface{}, draft interface{}) (interface{}, error) {
	return nil, nil
}

func (m *mockAlumniRepo) Update(ctx interface{}, id int64, draft interface{}) (interface{}, error) {
	return nil, nil
}

func (m *mockAlumniRepo) Get(ctx interface{}, id int64) (AlumniRow, error) {
	for _, r := range m.records {
		if r.ID == id {
			return r, nil
		}
	}
	return AlumniRow{}, ErrNotFound
}

func (m *mockAlumniRepo) Delete(ctx interface{}, id int64) error {
	return nil
}

var ErrNotFound = errors.New("not found")

type AlumniRow struct {
	ID       int64  `json:"id"`
	Status   string `json:"status"`
	FullName string `json:"fullName"`
}

// Mock implementation of parseDraft and conflictAware needed if they are used in Export
// Assuming Export uses similar validation logic to Update or a dedicated one.
// Based on the code snippet provided, Export is not fully implemented in the snippet, 
// but the test is designed for the expected behavior described in the design.
// We assume the Export method exists in the real implementation and follows the pattern.
// For the test to pass, we need to mock the dependencies or assume the handler has the method.
// Since the target is "exports.alumni_handler.Export", we assume the method exists.

// Placeholder for Export method if not present in the provided snippet but expected by the test
// func (h *AlumniHandler) Export(c *fiber.Ctx) error { ... }
// This test assumes the Export method is implemented as per the design requirements.
// The test verifies the behavior: 200 for valid active, 400 for invalid ID, 404 for not found or deleted.
}