## Component Specification

### Name & Purpose
`upload.Store` — writes files submitted with multipart requests to disk and
returns their public path. Everything here is about making the unsafe parts safe.

### Location
`api/internal/upload/upload.go`, `api/internal/upload/copy.go`

### Public Interface

```go
const MaxFileSize = 10 << 20 // 10 MiB

func NewStore(root, publicURL string) (*Store, error)
func (s *Store) Save(header *multipart.FileHeader, subdir string) (string, error)
```

`Save` returns a public path such as
`/api/uploads/products/2026/08/c6a47d27….png`.

### Dependencies
- Internal: none.
- External: standard library only (`crypto/rand`, `mime/multipart`, `os`,
  `path/filepath`).

### Data Models
Owns no database entity. Files are laid out as
`<root>/<subdir>/<YYYY>/<MM>/<32 hex chars><ext>`.

### Business Rules & Constraints

**The stored name is random; only the extension comes from the request:**

```go
ext := strings.ToLower(filepath.Ext(header.Filename))
if !allowedExtensions[ext] { return "", fmt.Errorf("file type %q is not allowed", ext) }
name, err := randomName()          // 16 random bytes, hex
target := filepath.Join(dir, name+ext)
```

That single decision removes three bug classes at once: directory traversal
(`../../etc/passwd`), collisions between two users uploading `photo.png`, and
crafted filenames overwriting existing files. **Verified**: a filename of
`../../../../etc/passwd.png` is stored as
`/api/uploads/products/2026/08/bdd89ec8….png`.

**Extensions are an allow-list, not a deny-list.** Denying `.php` and friends is
a game you lose; permitting a known-good set is one you win:

```go
var allowedExtensions = map[string]bool{
    ".png": true, ".jpg": true, ".jpeg": true, ".webp": true, ".gif": true,
    ".pdf": true, ".txt": true, ".csv": true, ".md": true,
}
```

**The size limit is enforced twice.** `header.Size` comes from the request and
cannot be trusted, so the copy is bounded too:

```go
written, err := io.Copy(dst, io.LimitReader(src, limit+1))
if written > limit { return written, fmt.Errorf("file is larger than %d MiB", limit>>20) }
```

**`O_EXCL` on create** — never overwrite. **A partial write is deleted**; a
truncated file is worse than none.

**The `subdir` is passed through `filepath.Base`** because it is caller-supplied
and a caller can be wrong.

**Deployment note.** The upload root must exist *in the image*, owned by the app
user — Docker seeds a fresh named volume from the image directory including its
ownership. Without it the mount arrives owned by root and every upload fails with
"permission denied". See `api/Dockerfile`.

### Extension Points

- **A new file type:** one entry in `allowedExtensions`.
- **Object storage (S3, GCS):** implement the same `Save` signature and swap the
  construction in `main.go`. Nothing else calls the filesystem.
- **Content-type sniffing:** `Save` currently trusts the extension only. Adding
  `http.DetectContentType` over the first 512 bytes would be the next hardening
  step. **Not implemented.**
- **Deletion / orphan cleanup:** not implemented. Replacing a product image
  currently leaves the old file on disk.
