package handler

import (
	"context"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"

	"github.com/example/idol-promo/api/internal/apperror"
	"github.com/example/idol-promo/api/internal/model"
	"github.com/example/idol-promo/api/internal/pagination"
	"github.com/example/idol-promo/api/internal/repository"
	"github.com/example/idol-promo/api/internal/upload"
)

type ProductHandler struct {
	repo    repository.ProductRepository
	uploads upload.Storage
	timeout time.Duration
}

func NewProductHandler(
	repo repository.ProductRepository,
	uploads upload.Storage,
	timeout time.Duration,
) *ProductHandler {
	return &ProductHandler{repo: repo, uploads: uploads, timeout: timeout}
}

// fiberQuery adapts Fiber to the pagination package's tiny Query interface, so
// that package stays free of any HTTP framework.
type fiberQuery struct{ c *fiber.Ctx }

func (q fiberQuery) Get(key string) string { return q.c.Query(key) }

/*
List returns products.

Three modes, selected by query string, because a grid, an infinite scroll and an
export genuinely need different things:

	GET /api/products?page=2&pageSize=25      numbered pages (default)
	GET /api/products?mode=keyset&cursor=…    constant-time deep paging
	GET /api/products?mode=all                everything matching the filters

`withTotal=false` skips the COUNT, which is worth roughly half the query time on
a large filtered table and is never needed by an infinite scroll.
*/
func (h *ProductHandler) List(c *fiber.Ctx) error {
	params := pagination.Parse(fiberQuery{c}, model.ProductSortColumns, model.ProductFilters)

	ctx, cancel := context.WithTimeout(c.UserContext(), h.timeout)
	defer cancel()

	page, err := h.repo.List(ctx, params)
	if err != nil {
		// A bad cursor is the caller's mistake, not a server fault.
		if strings.Contains(err.Error(), "cursor") || strings.Contains(err.Error(), "keyset") {
			return apperror.New(http.StatusBadRequest, "INVALID_CURSOR", err.Error(), err)
		}
		return err
	}
	return c.JSON(page)
}

func (h *ProductHandler) Get(c *fiber.Ctx) error {
	id, err := parseID(c)
	if err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(c.UserContext(), h.timeout)
	defer cancel()

	product, err := h.repo.GetByID(ctx, id)
	if errors.Is(err, repository.ErrNotFound) {
		return apperror.New(http.StatusNotFound, "NOT_FOUND", "No product with that id.", err)
	}
	if err != nil {
		return err
	}
	setProductETag(c, product.Version)
	return c.JSON(product)
}

/*
Create accepts JSON or multipart, chosen by Content-Type.

One handler rather than two endpoints: the caller should not have to use a
different URL because it happens to have a file. Both paths decode into the same
`productInput` and run the same validation, so they cannot accept different
things — which is the failure mode when upload support is bolted on beside an
existing JSON endpoint.
*/
func (h *ProductHandler) Create(c *fiber.Ctx) error {
	input, files, err := h.decode(c)
	if err != nil {
		return err
	}

	product, _, err := input.toModel(false)
	if err != nil {
		return err
	}

	// Files are saved only after validation passes, so a rejected request does
	// not leave orphans on disk.
	saved, err := h.attachFiles(product, files)
	if err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(c.UserContext(), h.timeout)
	defer cancel()

	if err := h.repo.Create(ctx, product); err != nil {
		h.cleanupUploads(saved)
		if errors.Is(err, repository.ErrDuplicate) {
			return apperror.New(http.StatusConflict, "DUPLICATE_PRODUCT_ID",
				"A product with that product ID already exists.", err)
		}
		return err
	}

	// 201 with the created row: the client inserts it directly instead of
	// refetching the list, which is what makes the grid update silently.
	c.Locals(auditResourceIDKey, product.ID)
	setProductETag(c, product.Version)
	return c.Status(http.StatusCreated).JSON(product)
}

// Update is a partial update: only the fields present in the request change.
func (h *ProductHandler) Update(c *fiber.Ctx) error {
	id, err := parseID(c)
	if err != nil {
		return err
	}

	input, files, err := h.decode(c)
	if err != nil {
		return err
	}

	_, patch, err := input.toModel(true)
	if err != nil {
		return err
	}
	expectedVersion, err := parseExpectedVersion(c)
	if err != nil {
		return err
	}

	var previous *model.Product
	var saved []string
	if files.any() {
		lookupCtx, lookupCancel := context.WithTimeout(c.UserContext(), h.timeout)
		previous, err = h.repo.GetByID(lookupCtx, id)
		lookupCancel()
		if errors.Is(err, repository.ErrNotFound) {
			return apperror.New(http.StatusNotFound, "NOT_FOUND", "No product with that id.", err)
		}
		if err != nil {
			return err
		}

		staged := &model.Product{}
		saved, err = h.attachFiles(staged, files)
		if err != nil {
			return err
		}
		if staged.ProductImagePath != nil {
			patch["product_image_path"] = *staged.ProductImagePath
		}
		if len(staged.ProductDocumentPaths) > 0 {
			patch["product_document_paths"] = staged.ProductDocumentPaths
		}
	}

	ctx, cancel := context.WithTimeout(c.UserContext(), h.timeout)
	defer cancel()

	updated, err := h.repo.Update(ctx, id, expectedVersion.pointer(), patch)
	if errors.Is(err, repository.ErrNotFound) {
		h.cleanupUploads(saved)
		return apperror.New(http.StatusNotFound, "NOT_FOUND", "No product with that id.", err)
	}
	if errors.Is(err, repository.ErrDuplicate) {
		h.cleanupUploads(saved)
		return apperror.New(http.StatusConflict, "DUPLICATE_PRODUCT_ID",
			"A product with that product ID already exists.", err)
	}
	if errors.Is(err, repository.ErrVersionConflict) {
		h.cleanupUploads(saved)
		return apperror.New(http.StatusPreconditionFailed, "VERSION_CONFLICT",
			"The product changed after it was loaded. Refresh and try again.", err)
	}
	if err != nil {
		h.cleanupUploads(saved)
		return err
	}
	if previous != nil {
		h.cleanupReplacedUploads(previous, files)
	}
	setProductETag(c, updated.Version)
	return c.JSON(updated)
}

func (h *ProductHandler) Delete(c *fiber.Ctx) error {
	id, err := parseID(c)
	if err != nil {
		return err
	}
	expectedVersion, err := parseExpectedVersion(c)
	if err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(c.UserContext(), h.timeout)
	defer cancel()
	product, err := h.repo.Delete(ctx, id, expectedVersion.pointer())
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return apperror.New(http.StatusNotFound, "NOT_FOUND", "No product with that id.", err)
		}
		if errors.Is(err, repository.ErrVersionConflict) {
			return apperror.New(http.StatusPreconditionFailed, "VERSION_CONFLICT",
				"The product changed after it was loaded. Refresh and try again.", err)
		}
		return err
	}
	h.cleanupUploads(productUploadPaths(product))
	return c.SendStatus(http.StatusNoContent)
}

// uploadedFiles carries the two file fields the schema defines.
type uploadedFiles struct {
	image     []*multipartHeader
	documents []*multipartHeader
}

// decode reads either representation into the shared input type.
func (h *ProductHandler) decode(c *fiber.Ctx) (productInput, uploadedFiles, error) {
	contentType := strings.ToLower(c.Get("Content-Type"))

	if !strings.HasPrefix(contentType, "multipart/form-data") {
		var in productInput
		if err := c.BodyParser(&in); err != nil {
			return in, uploadedFiles{}, apperror.New(http.StatusBadRequest, "INVALID_BODY",
				"Malformed request body.", err)
		}
		return in, uploadedFiles{}, nil
	}

	form, err := c.MultipartForm()
	if err != nil {
		return productInput{}, uploadedFiles{}, apperror.New(http.StatusBadRequest,
			"INVALID_BODY", "Malformed multipart body.", err)
	}

	in := fromForm(
		func(key string) string {
			if values := form.Value[key]; len(values) > 0 {
				return values[0]
			}
			return ""
		},
		func(key string) bool { _, ok := form.Value[key]; return ok },
		func(key string) []string { return form.Value[key] },
	)

	return in, uploadedFiles{
		image:     form.File["productImage"],
		documents: form.File["productDocuments"],
	}, nil
}

func (h *ProductHandler) attachFiles(product *model.Product, files uploadedFiles) ([]string, error) {
	saved := []string{}
	if h.uploads == nil {
		return saved, nil
	}
	if len(files.image) > 0 {
		path, err := h.uploads.Save(files.image[0], "products")
		if err != nil {
			return nil, apperror.New(http.StatusUnprocessableEntity, "INVALID_UPLOAD", err.Error(), err)
		}
		saved = append(saved, path)
		product.ProductImagePath = &path
	}
	for _, header := range files.documents {
		path, err := h.uploads.Save(header, "products")
		if err != nil {
			h.cleanupUploads(saved)
			return nil, apperror.New(http.StatusUnprocessableEntity, "INVALID_UPLOAD", err.Error(), err)
		}
		saved = append(saved, path)
		product.ProductDocumentPaths = append(product.ProductDocumentPaths, path)
	}
	return saved, nil
}

func (h *ProductHandler) cleanupUploads(paths []string) {
	if h.uploads == nil {
		return
	}
	for _, path := range paths {
		_ = h.uploads.Delete(path)
	}
}

func (h *ProductHandler) cleanupReplacedUploads(previous *model.Product, files uploadedFiles) {
	if len(files.image) > 0 && previous.ProductImagePath != nil {
		h.cleanupUploads([]string{*previous.ProductImagePath})
	}
	if len(files.documents) > 0 {
		h.cleanupUploads(previous.ProductDocumentPaths)
	}
}

func productUploadPaths(product *model.Product) []string {
	paths := make([]string, 0, 1+len(product.ProductDocumentPaths))
	if product.ProductImagePath != nil {
		paths = append(paths, *product.ProductImagePath)
	}
	return append(paths, product.ProductDocumentPaths...)
}

func parseID(c *fiber.Ctx) (uint64, error) {
	id, err := strconv.ParseUint(c.Params("id"), 10, 64)
	if err != nil || id == 0 {
		return 0, apperror.New(http.StatusBadRequest, "INVALID_ID",
			"The product id must be a positive number.", err)
	}
	return id, nil
}

type productVersionPrecondition struct {
	value   uint64
	present bool
}

func (v productVersionPrecondition) pointer() *uint64 {
	if !v.present {
		return nil
	}
	return &v.value
}

func parseExpectedVersion(c *fiber.Ctx) (productVersionPrecondition, error) {
	raw := strings.TrimSpace(c.Get(fiber.HeaderIfMatch))
	if raw == "" {
		return productVersionPrecondition{}, nil
	}
	raw = strings.TrimPrefix(raw, "W/")
	raw = strings.Trim(raw, "\"")
	version, err := strconv.ParseUint(raw, 10, 64)
	if err != nil || version == 0 {
		return productVersionPrecondition{}, apperror.New(http.StatusBadRequest, "INVALID_IF_MATCH",
			"If-Match must contain a positive product version.", err)
	}
	return productVersionPrecondition{value: version, present: true}, nil
}

func setProductETag(c *fiber.Ctx, version uint64) {
	c.Set(fiber.HeaderETag, "\""+strconv.FormatUint(version, 10)+"\"")
}

func (f uploadedFiles) any() bool {
	return len(f.image) > 0 || len(f.documents) > 0
}
