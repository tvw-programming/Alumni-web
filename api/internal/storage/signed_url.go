// Package storage issues short-lived signed URLs for direct-to-bucket uploads.
//
// The bytes never pass through this API. A photo goes from the browser straight
// to Cloud Storage, which keeps large uploads off the request path entirely —
// no memory spike, no request timeout, no bandwidth bill twice over.
//
// What the API keeps is the decision: who may write, where, what content type,
// how large, and for how long. All of that is baked into the signature, so the
// URL is not a general-purpose write capability — it opens exactly one door.
package storage

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"path"
	"time"

	"cloud.google.com/go/storage"
)

// Deliberately short. The client asks for a URL immediately before uploading,
// so minutes are enough, and a leaked URL stops being useful quickly.
const SignedURLTTL = 10 * time.Minute

// MaxUploadBytes is enforced twice: signed into the URL's x-goog-content-length-range
// condition so the bucket itself rejects an oversized body, and checked again
// when the client reports the upload. The bucket's copy is the one that counts.
const MaxUploadBytes = 25 << 20 // 25 MiB

var allowedContentTypes = map[string]string{
	"image/jpeg": ".jpg",
	"image/png":  ".png",
	"image/webp": ".webp",
	"video/mp4":  ".mp4",
}

var (
	ErrContentTypeNotAllowed = errors.New("content type is not allowed")
	ErrTooLarge              = errors.New("declared size exceeds the upload limit")
)

type Signer struct {
	bucket         string
	serviceAccount string
	signBytes      func([]byte) ([]byte, error)
	now            func() time.Time
}

type UploadGrant struct {
	// URL the browser PUTs to. Carries the signature; treat as a secret.
	URL string `json:"uploadUrl"`
	// ObjectPath is what we persist. The client cannot choose it.
	ObjectPath string `json:"objectPath"`
	// Headers the client must send verbatim, or the signature will not match.
	Headers   map[string]string `json:"headers"`
	ExpiresAt time.Time         `json:"expiresAt"`
}

func NewSigner(bucket, serviceAccount string, signBytes func([]byte) ([]byte, error)) *Signer {
	return &Signer{bucket: bucket, serviceAccount: serviceAccount, signBytes: signBytes, now: time.Now}
}

// GrantUpload returns a one-object, one-method, one-content-type write URL.
//
// The object path is derived, never accepted: a client-supplied filename is how
// you end up with traversal, collisions, and one user overwriting another's
// photo. Random suffix over a sequence number so an object path leaks nothing
// about how many uploads exist.
func (s *Signer) GrantUpload(ctx context.Context, alumniID int64, contentType string, declaredBytes int64) (*UploadGrant, error) {
	ext, ok := allowedContentTypes[contentType]
	if !ok {
		return nil, fmt.Errorf("%w: %s", ErrContentTypeNotAllowed, contentType)
	}
	if declaredBytes > MaxUploadBytes {
		return nil, fmt.Errorf("%w: %d bytes", ErrTooLarge, declaredBytes)
	}

	suffix := make([]byte, 8)
	if _, err := rand.Read(suffix); err != nil {
		return nil, fmt.Errorf("generating object name: %w", err)
	}
	objectPath := path.Join(
		"alumni", fmt.Sprint(alumniID), "media",
		s.now().UTC().Format("2006/01")+"-"+hex.EncodeToString(suffix)+ext,
	)

	expires := s.now().Add(SignedURLTTL)
	url, err := storage.SignedURL(s.bucket, objectPath, &storage.SignedURLOptions{
		Scheme:         storage.SigningSchemeV4,
		Method:         "PUT",
		GoogleAccessID: s.serviceAccount,
		SignBytes:      s.signBytes,
		Expires:        expires,
		ContentType:    contentType,
		Headers: []string{
			// Signed in, so a client that lies about the size gets a 403 from
			// the bucket rather than a surprise storage bill.
			fmt.Sprintf("x-goog-content-length-range:0,%d", MaxUploadBytes),
		},
	})
	if err != nil {
		return nil, fmt.Errorf("signing upload url: %w", err)
	}

	return &UploadGrant{
		URL:        url,
		ObjectPath: objectPath,
		Headers: map[string]string{
			"Content-Type":                contentType,
			"x-goog-content-length-range": fmt.Sprintf("0,%d", MaxUploadBytes),
		},
		ExpiresAt: expires,
	}, nil
}

// GrantRead signs a short-lived read URL for one object.
//
// The bucket stays private: nothing is publicly readable, including approved
// media. The gallery asks for these in a batch and refreshes them as they age,
// which means an object that is later rejected stops being reachable instead of
// living on at a URL someone has already copied.
func (s *Signer) GrantRead(ctx context.Context, objectPath string, ttl time.Duration) (string, error) {
	return storage.SignedURL(s.bucket, objectPath, &storage.SignedURLOptions{
		Scheme:         storage.SigningSchemeV4,
		Method:         "GET",
		GoogleAccessID: s.serviceAccount,
		SignBytes:      s.signBytes,
		Expires:        s.now().Add(ttl),
	})
}
