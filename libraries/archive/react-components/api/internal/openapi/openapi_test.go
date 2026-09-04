package openapi

import (
	"strings"
	"testing"

	"gopkg.in/yaml.v3"
)

func TestEmbeddedSpecificationBuildsSwaggerHandler(t *testing.T) {
	if Handler() == nil {
		t.Fatal("Handler returned nil")
	}
}

func TestEmbeddedSpecificationHasRequiredRoutes(t *testing.T) {
	var document struct {
		OpenAPI string                    `yaml:"openapi"`
		Paths   map[string]map[string]any `yaml:"paths"`
	}
	if err := yaml.Unmarshal(specification, &document); err != nil {
		t.Fatalf("parse OpenAPI YAML: %v", err)
	}
	if !strings.HasPrefix(document.OpenAPI, "3.1.") {
		t.Fatalf("OpenAPI version = %q, want 3.1.x", document.OpenAPI)
	}
	for _, path := range []string{
		"/livez", "/readyz", "/startupz", "/api/auth/login", "/api/products/{id}",
	} {
		if _, ok := document.Paths[path]; !ok {
			t.Errorf("OpenAPI contract is missing %s", path)
		}
	}
}
