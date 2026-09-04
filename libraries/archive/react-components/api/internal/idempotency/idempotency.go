// Package idempotency prevents a retried mutation from being applied twice.
// Records live in PostgreSQL so the behavior is consistent across API replicas.
package idempotency

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"hash"
	"io"
	"log/slog"
	"mime"
	"net/http"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"github.com/example/idol-promo/api/internal/apperror"
)

const Header = "Idempotency-Key"

type Record struct {
	ID                  uint64 `gorm:"primaryKey;autoIncrement"`
	Scope               string `gorm:"type:varchar(160);not null;uniqueIndex:idx_idempotency_scope_key"`
	IdempotencyKey      string `gorm:"type:varchar(128);not null;uniqueIndex:idx_idempotency_scope_key"`
	RequestHash         string `gorm:"type:char(64);not null"`
	State               string `gorm:"type:varchar(16);not null;default:processing"`
	ResponseStatus      *int
	ResponseContentType *string
	ResponseETag        *string `gorm:"column:response_etag"`
	ResponseBody        []byte
	ExpiresAt           time.Time
	CreatedAt           time.Time
	UpdatedAt           time.Time
}

func (Record) TableName() string { return "idempotency_records" }

type Store struct{ db *gorm.DB }

func NewStore(db *gorm.DB) *Store { return &Store{db: db} }

func (s *Store) begin(ctx context.Context, record *Record) (*Record, bool, error) {
	created, err := s.tryCreate(ctx, record)
	if err != nil {
		return nil, false, err
	}
	if created {
		return record, true, nil
	}
	var existing Record
	if findErr := s.db.WithContext(ctx).
		Where("scope = ? AND idempotency_key = ?", record.Scope, record.IdempotencyKey).
		First(&existing).Error; findErr != nil {
		return nil, false, fmt.Errorf("find idempotency record: %w", findErr)
	}
	if !existing.ExpiresAt.After(time.Now()) {
		// Delete only the row we observed as expired. If another request already
		// replaced it, RowsAffected is zero and that request remains authoritative.
		result := s.db.WithContext(ctx).Where("id = ? AND expires_at <= ?", existing.ID, time.Now()).
			Delete(&Record{})
		if result.Error != nil {
			return nil, false, fmt.Errorf("delete expired idempotency record: %w", result.Error)
		}
		if result.RowsAffected == 1 {
			record.ID = 0
			created, createErr := s.tryCreate(ctx, record)
			if createErr != nil {
				return nil, false, createErr
			}
			if created {
				return record, true, nil
			}
		}
		if findErr := s.db.WithContext(ctx).
			Where("scope = ? AND idempotency_key = ?", record.Scope, record.IdempotencyKey).
			First(&existing).Error; findErr != nil {
			return nil, false, fmt.Errorf("find replacement idempotency record: %w", findErr)
		}
	}
	return &existing, false, nil
}

func (s *Store) tryCreate(ctx context.Context, record *Record) (bool, error) {
	result := s.db.WithContext(ctx).Clauses(clause.OnConflict{DoNothing: true}).Create(record)
	if result.Error != nil {
		return false, fmt.Errorf("create idempotency record: %w", result.Error)
	}
	return result.RowsAffected == 1, nil
}

func (s *Store) complete(
	ctx context.Context,
	id uint64,
	status int,
	contentType, etag string,
	body []byte,
) error {
	return s.db.WithContext(ctx).Model(&Record{}).Where("id = ?", id).Updates(map[string]any{
		"state":                 "complete",
		"response_status":       status,
		"response_content_type": contentType,
		"response_etag":         etag,
		"response_body":         body,
	}).Error
}

func (s *Store) abandon(ctx context.Context, id uint64) {
	_ = s.db.WithContext(ctx).Delete(&Record{}, id).Error
}

type ScopeFunc func(*fiber.Ctx) string

func Middleware(
	store *Store,
	logger *slog.Logger,
	timeout, lifetime time.Duration,
	scope ScopeFunc,
) fiber.Handler {
	return func(c *fiber.Ctx) error {
		key := strings.TrimSpace(c.Get(Header))
		if key == "" {
			return c.Next()
		}
		if len(key) < 8 || len(key) > 128 {
			return apperror.New(http.StatusBadRequest, "INVALID_IDEMPOTENCY_KEY",
				"Idempotency-Key must contain 8–128 characters.", nil)
		}

		requestHash, hashErr := fingerprint(c)
		if hashErr != nil {
			return apperror.New(http.StatusBadRequest, "INVALID_BODY",
				"The request body could not be inspected for idempotency.", hashErr)
		}
		record := &Record{
			Scope:          scope(c) + ":" + c.Method() + ":" + c.Route().Path,
			IdempotencyKey: key,
			RequestHash:    requestHash,
			State:          "processing",
			ExpiresAt:      time.Now().Add(lifetime),
		}
		ctx, cancel := context.WithTimeout(c.UserContext(), timeout)
		stored, created, err := store.begin(ctx, record)
		cancel()
		if err != nil {
			return err
		}
		if !created {
			if stored.RequestHash != requestHash {
				return apperror.New(http.StatusConflict, "IDEMPOTENCY_KEY_REUSED",
					"This idempotency key was already used for a different request.", nil)
			}
			if stored.State != "complete" || stored.ResponseStatus == nil {
				return apperror.New(http.StatusConflict, "REQUEST_IN_PROGRESS",
					"A request with this idempotency key is still being processed.", nil)
			}
			if stored.ResponseContentType != nil {
				c.Set(fiber.HeaderContentType, *stored.ResponseContentType)
			}
			if stored.ResponseETag != nil && *stored.ResponseETag != "" {
				c.Set(fiber.HeaderETag, *stored.ResponseETag)
			}
			return c.Status(*stored.ResponseStatus).Send(stored.ResponseBody)
		}

		if err := c.Next(); err != nil {
			cleanupCtx, cleanupCancel := context.WithTimeout(context.Background(), timeout)
			store.abandon(cleanupCtx, record.ID)
			cleanupCancel()
			return err
		}
		status := c.Response().StatusCode()
		if status < 200 || status >= 300 {
			cleanupCtx, cleanupCancel := context.WithTimeout(context.Background(), timeout)
			store.abandon(cleanupCtx, record.ID)
			cleanupCancel()
			return nil
		}

		body := append([]byte(nil), c.Response().Body()...)
		contentType := c.GetRespHeader(fiber.HeaderContentType)
		etag := c.GetRespHeader(fiber.HeaderETag)
		completeCtx, completeCancel := context.WithTimeout(context.Background(), timeout)
		defer completeCancel()
		if err := store.complete(completeCtx, record.ID, status, contentType, etag, body); err != nil {
			// The business mutation already committed. Preserve its successful
			// response and leave the key in processing state so a retry cannot
			// apply the mutation twice. Maintenance eventually expires the record.
			logger.Error("idempotency response persistence failed",
				"record_id", record.ID, "error", err)
		}
		return nil
	}
}

func fingerprint(c *fiber.Ctx) (string, error) {
	contentType := strings.ToLower(strings.TrimSpace(c.Get(fiber.HeaderContentType)))
	mediaType, _, err := mime.ParseMediaType(contentType)
	if err != nil {
		mediaType = contentType
	}
	hasher := sha256.New()
	writeFingerprintPart(hasher, "media:"+mediaType)

	if mediaType != fiber.MIMEMultipartForm {
		_, _ = hasher.Write(c.Body())
		return hex.EncodeToString(hasher.Sum(nil)), nil
	}

	form, err := c.MultipartForm()
	if err != nil {
		return "", fmt.Errorf("parse multipart body: %w", err)
	}
	valueKeys := make([]string, 0, len(form.Value))
	for key := range form.Value {
		valueKeys = append(valueKeys, key)
	}
	sort.Strings(valueKeys)
	for _, key := range valueKeys {
		writeFingerprintPart(hasher, "field:"+key)
		for _, value := range form.Value[key] {
			writeFingerprintPart(hasher, "value:"+value)
		}
	}

	fileKeys := make([]string, 0, len(form.File))
	for key := range form.File {
		fileKeys = append(fileKeys, key)
	}
	sort.Strings(fileKeys)
	for _, key := range fileKeys {
		writeFingerprintPart(hasher, "file-field:"+key)
		for _, header := range form.File[key] {
			// The original name is deliberately excluded because the storage layer
			// randomizes it; the extension remains part of validation semantics.
			writeFingerprintPart(hasher, "extension:"+strings.ToLower(filepath.Ext(header.Filename)))
			writeFingerprintPart(hasher, "size:"+strconv.FormatInt(header.Size, 10))
			file, openErr := header.Open()
			if openErr != nil {
				return "", fmt.Errorf("open multipart file: %w", openErr)
			}
			_, copyErr := io.Copy(hasher, file)
			closeErr := file.Close()
			if copyErr != nil || closeErr != nil {
				return "", fmt.Errorf("hash multipart file: %w", errors.Join(copyErr, closeErr))
			}
		}
	}
	return hex.EncodeToString(hasher.Sum(nil)), nil
}

func writeFingerprintPart(hasher hash.Hash, value string) {
	_, _ = fmt.Fprintf(hasher, "%d:", len(value))
	_, _ = hasher.Write([]byte(value))
}
