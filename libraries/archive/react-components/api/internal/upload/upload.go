// Package upload stores files submitted with multipart requests.
//
// Deliberately small and local: this is a demo stack, so files land on disk
// under a configured root. Everything here is about making the *unsafe* parts
// safe — a filename from a request is attacker-controlled, and treating it as a
// path is how directory traversal happens.
package upload

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// MaxFileSize caps a single upload. Without it, one request can fill the disk.
const MaxFileSize = 10 << 20 // 10 MiB

var (
	ErrFileTooLarge       = errors.New("file is too large")
	ErrFileTypeNotAllowed = errors.New("file type is not allowed")
	ErrContentMismatch    = errors.New("file content does not match its extension")
	ErrPathOutsideStore   = errors.New("upload path is outside the configured store")
	ErrEmptyFile          = errors.New("empty files are not allowed")
)

const mediaTypeTextPlain = "text/plain"

// allowedExtensions is an allow-list, not a deny-list. Denying ".php" and
// friends is a game you lose; permitting a known-good set is one you win.
var allowedExtensions = map[string]bool{
	".png": true, ".jpg": true, ".jpeg": true, ".webp": true, ".gif": true,
	".pdf": true, ".txt": true, ".csv": true, ".md": true,
}

var allowedMediaTypes = map[string]map[string]bool{
	".png":  {"image/png": true},
	".jpg":  {"image/jpeg": true},
	".jpeg": {"image/jpeg": true},
	".webp": {"image/webp": true},
	".gif":  {"image/gif": true},
	".pdf":  {"application/pdf": true},
	".txt":  {mediaTypeTextPlain: true},
	".csv":  {mediaTypeTextPlain: true, "text/csv": true, "application/csv": true},
	".md":   {mediaTypeTextPlain: true, "text/markdown": true},
}

// Storage is the provider boundary consumed by HTTP handlers. Local disk is
// the default implementation; an S3-compatible adapter can be added without
// changing product orchestration or persisted public paths.
type Storage interface {
	Save(header *multipart.FileHeader, subdir string) (string, error)
	Delete(publicPath string) error
}

type Store struct {
	root      string
	publicURL string
}

func NewStore(root, publicURL string) (*Store, error) {
	if err := os.MkdirAll(root, 0o750); err != nil {
		return nil, fmt.Errorf("create upload root: %w", err)
	}
	return &Store{root: root, publicURL: strings.TrimRight(publicURL, "/")}, nil
}

// Save writes one uploaded file and returns its public path.
//
// The stored name is randomly generated and only the *extension* is taken from
// the request. That single decision removes directory traversal ("../../etc"),
// collisions between two users uploading "photo.png", and the class of bug
// where a crafted filename overwrites something.
func (s *Store) Save(header *multipart.FileHeader, subdir string) (string, error) {
	if header.Size > MaxFileSize {
		return "", fmt.Errorf("%w: %q exceeds %d MiB", ErrFileTooLarge, header.Filename, MaxFileSize>>20)
	}

	ext := strings.ToLower(filepath.Ext(header.Filename))
	if !allowedExtensions[ext] {
		return "", fmt.Errorf("%w: %q", ErrFileTypeNotAllowed, ext)
	}

	// `filepath.Base` on the subdir too: it is caller-supplied and a caller can
	// be wrong.
	dir := filepath.Join(s.root, filepath.Base(subdir), time.Now().UTC().Format("2006/01"))
	if err := os.MkdirAll(dir, 0o750); err != nil {
		return "", fmt.Errorf("create upload directory: %w", err)
	}

	name, err := randomName()
	if err != nil {
		return "", err
	}
	target := filepath.Join(dir, name+ext)

	src, err := header.Open()
	if err != nil {
		return "", fmt.Errorf("open upload: %w", err)
	}
	defer src.Close()

	mediaType, err := detectMediaType(src)
	if err != nil {
		return "", err
	}
	if !allowedMediaTypes[ext][mediaType] {
		return "", fmt.Errorf("%w: content type %q, extension %q", ErrContentMismatch, mediaType, ext)
	}

	// #nosec G304 -- target is built from the configured root, a base-only
	// subdirectory, a UTC date, a random name, and an allowlisted extension.
	dst, err := os.OpenFile(target, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0o600)
	if err != nil {
		return "", fmt.Errorf("create upload target: %w", err)
	}
	defer dst.Close()

	// io.Copy is bounded by MaxFileSize above; a LimitReader guards against a
	// header that lied about Size.
	if _, copyErr := copyLimited(dst, src, MaxFileSize); copyErr != nil {
		// A partially written file is worse than none.
		_ = os.Remove(target)
		return "", copyErr
	}

	rel, err := filepath.Rel(s.root, target)
	if err != nil {
		return "", fmt.Errorf("resolve upload path: %w", err)
	}
	return s.publicURL + "/" + filepath.ToSlash(rel), nil
}

// Delete removes a previously stored public path. Paths outside this store are
// rejected even if a caller passes a crafted value.
func (s *Store) Delete(publicPath string) error {
	prefix := s.publicURL + "/"
	if !strings.HasPrefix(publicPath, prefix) {
		return ErrPathOutsideStore
	}

	relative := filepath.Clean(filepath.FromSlash(strings.TrimPrefix(publicPath, prefix)))
	if relative == "." || relative == ".." || strings.HasPrefix(relative, ".."+string(filepath.Separator)) {
		return ErrPathOutsideStore
	}

	target := filepath.Join(s.root, relative)
	resolved, err := filepath.Rel(s.root, target)
	if err != nil || resolved == ".." || strings.HasPrefix(resolved, ".."+string(filepath.Separator)) {
		return ErrPathOutsideStore
	}
	if err := os.Remove(target); err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("delete upload: %w", err)
	}
	return nil
}

func detectMediaType(file multipart.File) (string, error) {
	header := make([]byte, 512)
	n, err := io.ReadFull(file, header)
	if err != nil && !errors.Is(err, io.EOF) && !errors.Is(err, io.ErrUnexpectedEOF) {
		return "", fmt.Errorf("inspect upload: %w", err)
	}
	if n == 0 {
		return "", ErrEmptyFile
	}
	if _, err := file.Seek(0, io.SeekStart); err != nil {
		return "", fmt.Errorf("rewind upload: %w", err)
	}
	return strings.Split(http.DetectContentType(header[:n]), ";")[0], nil
}

func randomName() (string, error) {
	buf := make([]byte, 16)
	if _, err := rand.Read(buf); err != nil {
		return "", fmt.Errorf("generate upload name: %w", err)
	}
	return hex.EncodeToString(buf), nil
}
