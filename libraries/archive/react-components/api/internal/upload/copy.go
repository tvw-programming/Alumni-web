package upload

import (
	"fmt"
	"io"
)

// copyLimited copies at most `limit` bytes and fails if the source has more.
//
// `header.Size` is taken from the request and cannot be trusted on its own; this
// is what actually enforces the ceiling.
func copyLimited(dst io.Writer, src io.Reader, limit int64) (int64, error) {
	written, err := io.Copy(dst, io.LimitReader(src, limit+1))
	if err != nil {
		return written, fmt.Errorf("write upload: %w", err)
	}
	if written > limit {
		return written, fmt.Errorf("%w: exceeds %d MiB", ErrFileTooLarge, limit>>20)
	}
	return written, nil
}
