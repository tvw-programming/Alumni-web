package upload

import (
	"os"
	"path/filepath"
	"testing"
)

func TestDeleteRemovesStoredPath(t *testing.T) {
	root := t.TempDir()
	store, err := NewStore(root, "/api/uploads")
	if err != nil {
		t.Fatalf("NewStore: %v", err)
	}
	target := filepath.Join(root, "products", "2026", "08", "file.txt")
	if err := os.MkdirAll(filepath.Dir(target), 0o750); err != nil {
		t.Fatalf("MkdirAll: %v", err)
	}
	if err := os.WriteFile(target, []byte("safe text"), 0o640); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}

	if err := store.Delete("/api/uploads/products/2026/08/file.txt"); err != nil {
		t.Fatalf("Delete: %v", err)
	}
	if _, err := os.Stat(target); !os.IsNotExist(err) {
		t.Fatalf("target still exists or stat failed unexpectedly: %v", err)
	}
}

func TestDeleteRejectsPathOutsideStore(t *testing.T) {
	store, err := NewStore(t.TempDir(), "/api/uploads")
	if err != nil {
		t.Fatalf("NewStore: %v", err)
	}
	for _, path := range []string{"/etc/passwd", "/api/uploads/../../etc/passwd"} {
		if err := store.Delete(path); err == nil {
			t.Fatalf("Delete(%q) accepted path outside store", path)
		}
	}
}
