// Media endpoints: issue an upload grant, accept the post-upload notification,
// and serve the gallery.
//
// The lifecycle of one photo, in full:
//
//  1. POST /api/v1/media/uploads   -> row inserted 'pending', signed URL returned
//  2. browser PUTs the bytes to Cloud Storage (this API is not involved)
//  3. Storage fires the object-finalize notification -> POST /internal/media/finalized
//  4. that handler queues Vision, which writes 'approved' or 'rejected'
//  5. GET /api/v1/alumni/:id/media returns approved rows only
//
// Step 1 creating the row before the bytes exist is what makes step 3 safe: the
// notification arrives with an object path we can recognise, so an upload to a
// path nobody granted is discarded rather than published.
package handler

import (
	"context"
	"errors"
	"log/slog"

	"github.com/gofiber/fiber/v2"

	"github.com/example/alumni/api/internal/firebaseauth"
	"github.com/example/alumni/api/internal/moderation"
	"github.com/example/alumni/api/internal/repository"
	"github.com/example/alumni/api/internal/storage"
)

type MediaHandler struct {
	repo   *repository.MediaRepository
	alumni *repository.AlumniRepository
	signer *storage.Signer
	vision *moderation.Service
	queue  chan<- int64
	logger *slog.Logger
}

func NewMediaHandler(
	repo *repository.MediaRepository,
	alumni *repository.AlumniRepository,
	signer *storage.Signer,
	vision *moderation.Service,
	queue chan<- int64,
	logger *slog.Logger,
) *MediaHandler {
	return &MediaHandler{repo: repo, alumni: alumni, signer: signer, vision: vision, queue: queue, logger: logger}
}

type uploadGrantRequest struct {
	ContentType string `json:"contentType" validate:"required"`
	SizeBytes   int64  `json:"sizeBytes"   validate:"required,gt=0"`
	Caption     string `json:"caption"     validate:"max=280"`
}

// RequestUpload issues the signed URL and records the intent.
func (h *MediaHandler) RequestUpload(ctx *fiber.Ctx) error {
	var body uploadGrantRequest
	if err := ctx.BodyParser(&body); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "malformed request body")
	}

	// The caller's own profile, resolved from the verified token. A client
	// cannot upload into someone else's gallery because it never names one.
	alumniID, err := h.alumni.IDForFirebaseUID(ctx.UserContext(), firebaseauth.UID(ctx))
	if err != nil {
		return err
	}

	grant, err := h.signer.GrantUpload(ctx.UserContext(), alumniID, body.ContentType, body.SizeBytes)
	switch {
	case errors.Is(err, storage.ErrContentTypeNotAllowed):
		return fiber.NewError(fiber.StatusUnsupportedMediaType, err.Error())
	case errors.Is(err, storage.ErrTooLarge):
		return fiber.NewError(fiber.StatusRequestEntityTooLarge, err.Error())
	case err != nil:
		return err
	}

	mediaID, err := h.repo.CreatePending(ctx.UserContext(), alumniID, grant.ObjectPath, body.ContentType, body.Caption)
	if err != nil {
		return err
	}

	return ctx.Status(fiber.StatusCreated).JSON(fiber.Map{
		"mediaId":    mediaID,
		"uploadUrl":  grant.URL,
		"objectPath": grant.ObjectPath,
		"headers":    grant.Headers,
		"expiresAt":  grant.ExpiresAt,
	})
}

type finalizedNotification struct {
	Name   string `json:"name"` // object path
	Bucket string `json:"bucket"`
	Size   string `json:"size"`
}

// Finalized is the Cloud Storage object-finalize webhook.
//
// It answers 200 as soon as the notification is recorded and hands the actual
// Vision call to a worker. Pub/Sub retries anything that is not acknowledged
// promptly, so doing 30 seconds of moderation inline would earn duplicate
// deliveries of work already in flight.
//
// Authenticated by OIDC at the route, not here: see main.go.
func (h *MediaHandler) Finalized(ctx *fiber.Ctx) error {
	var note finalizedNotification
	if err := ctx.BodyParser(&note); err != nil {
		// 200, not 400: a malformed notification will be redelivered forever
		// otherwise, and no number of retries will make it parse.
		h.logger.Error("unparseable storage notification", "error", err)
		return ctx.SendStatus(fiber.StatusOK)
	}

	mediaID, err := h.repo.MarkUploaded(ctx.UserContext(), note.Name)
	if errors.Is(err, repository.ErrNotFound) {
		// An object nobody was granted. Nothing references it, so it will be
		// swept by the bucket's lifecycle rule; publishing it is out of the
		// question precisely because we cannot say who put it there.
		h.logger.Warn("finalize for an ungranted object", "object", note.Name)
		return ctx.SendStatus(fiber.StatusOK)
	}
	if err != nil {
		return err
	}

	select {
	case h.queue <- mediaID:
	default:
		// Queue full: leave it pending. The reconciler sweeps anything that has
		// been pending too long, so a dropped hand-off delays a photo instead
		// of losing it.
		h.logger.Warn("moderation queue full, leaving pending", "media_id", mediaID)
	}
	return ctx.SendStatus(fiber.StatusOK)
}

// Moderate is the worker body, called off the request path.
func (h *MediaHandler) Moderate(ctx context.Context, mediaID int64) {
	objectPath, err := h.repo.ObjectPath(ctx, mediaID)
	if err != nil {
		h.logger.Error("moderation lookup failed", "media_id", mediaID, "error", err)
		return
	}

	result, err := h.vision.Inspect(ctx, objectPath)
	if err != nil {
		h.logger.Error("vision inspection failed", "media_id", mediaID, "error", err)
		// Falls through: Inspect returns Failed on error, and recording Failed
		// is what makes the item visible to an admin for a manual decision.
	}

	if err := h.repo.MarkModerated(ctx, mediaID, string(result.Verdict), result.Labels); err != nil {
		h.logger.Error("recording moderation failed", "media_id", mediaID, "error", err)
		return
	}
	h.logger.Info("media moderated", "media_id", mediaID, "verdict", result.Verdict)
}
