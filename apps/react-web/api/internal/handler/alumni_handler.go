// Alumni CRUD endpoints.
//
// Validation is deliberately repeated here rather than trusted from the
// browser: the admin screen checks the same rules, but the API is reachable
// without it, and the importer posts rows a person never saw in a form.
package handler

import (
	"errors"
	"log/slog"
	"regexp"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"

	"github.com/example/alumni/api/internal/repository"
)

type AlumniHandler struct {
	repo   *repository.AlumniRepository
	logger *slog.Logger
}

func NewAlumniHandler(repo *repository.AlumniRepository, logger *slog.Logger) *AlumniHandler {
	return &AlumniHandler{repo: repo, logger: logger}
}

// Ten digits beginning 6-9, the TRAI mobile series. Mirrors isIndianMobile in
// the browser and alumni_profiles_mobile_format in the schema; all three have
// to agree, and the schema is the one that actually holds.
var indianMobile = regexp.MustCompile(`^(?:\+?91[\s-]?|0)?[6-9]\d{9}$`)

func (h *AlumniHandler) List(c *fiber.Ctx) error {
	limit := clamp(c.QueryInt("limit", 25), 1, 200)
	offset := max(c.QueryInt("offset", 0), 0)

	page, err := h.repo.List(c.UserContext(), c.Query("q"), c.Query("status"), limit, offset)
	if err != nil {
		return err
	}
	return c.JSON(page)
}

func (h *AlumniHandler) Create(c *fiber.Ctx) error {
	draft, err := parseDraft(c)
	if err != nil {
		return err
	}
	row, err := h.repo.Create(c.UserContext(), draft)
	if err != nil {
		return conflictAware(err)
	}
	return c.Status(fiber.StatusCreated).JSON(row)
}

func (h *AlumniHandler) Update(c *fiber.Ctx) error {
	id, err := strconv.ParseInt(c.Params("id"), 10, 64)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "id must be a number")
	}
	draft, err := parseDraft(c)
	if err != nil {
		return err
	}
	row, err := h.repo.Update(c.UserContext(), id, draft)
	if errors.Is(err, repository.ErrNotFound) {
		return fiber.NewError(fiber.StatusNotFound, "no alumnus with that id")
	}
	if err != nil {
		return conflictAware(err)
	}
	return c.JSON(row)
}

func (h *AlumniHandler) BulkDelete(c *fiber.Ctx) error {
	var body struct {
		IDs []int64 `json:"ids"`
	}
	if err := c.BodyParser(&body); err != nil || len(body.IDs) == 0 {
		return fiber.NewError(fiber.StatusBadRequest, "send a non-empty ids array")
	}
	affected, err := h.repo.Delete(c.UserContext(), body.IDs)
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"deleted": affected})
}

func (h *AlumniHandler) Import(c *fiber.Ctx) error {
	var body struct {
		Rows []repository.Draft `json:"rows"`
	}
	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "malformed request body")
	}

	// Rows are validated before the transaction opens, so a bad row is reported
	// as a bad row rather than as a failed import.
	type failure struct {
		RowNumber int    `json:"rowNumber"`
		Reason    string `json:"reason"`
	}
	failed := []failure{}
	good := make([]repository.Draft, 0, len(body.Rows))
	for i, row := range body.Rows {
		if problems := validate(&row); len(problems) > 0 {
			failed = append(failed, failure{RowNumber: i + 2, Reason: strings.Join(problems, " ")})
			continue
		}
		good = append(good, row)
	}

	created, err := h.repo.Import(c.UserContext(), good)
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"created": created, "failed": failed})
}

func parseDraft(c *fiber.Ctx) (repository.Draft, error) {
	var draft repository.Draft
	if err := c.BodyParser(&draft); err != nil {
		return draft, fiber.NewError(fiber.StatusBadRequest, "malformed request body")
	}
	if problems := validate(&draft); len(problems) > 0 {
		return draft, fiber.NewError(fiber.StatusUnprocessableEntity, strings.Join(problems, " "))
	}
	return draft, nil
}

// validate normalises in place as well as checking: the mobile that reaches
// Postgres must already be +91XXXXXXXXXX, because the CHECK constraint accepts
// nothing else.
func validate(d *repository.Draft) []string {
	var problems []string

	d.FullName = strings.TrimSpace(d.FullName)
	if d.FullName == "" {
		problems = append(problems, "Name is required.")
	}
	if d.YearOfPassing == nil {
		problems = append(problems, "Year of passing is required.")
	} else if *d.YearOfPassing < 1900 || *d.YearOfPassing > 2100 {
		problems = append(problems, "Year of passing is out of range.")
	}
	if strings.TrimSpace(d.Course) == "" {
		problems = append(problems, "Course is required.")
	}

	if mobile := strings.TrimSpace(d.Mobile); mobile != "" {
		if !indianMobile.MatchString(strings.NewReplacer(" ", "", "-", "").Replace(mobile)) {
			problems = append(problems, "Mobile must be a 10-digit Indian number starting 6, 7, 8 or 9.")
		} else {
			d.Mobile = normaliseMobile(mobile)
		}
	}
	return problems
}

func normaliseMobile(raw string) string {
	digits := strings.Map(func(r rune) rune {
		if r >= '0' && r <= '9' {
			return r
		}
		return -1
	}, raw)
	if len(digits) < 10 {
		return raw
	}
	return "+91" + digits[len(digits)-10:]
}

// conflictAware turns Postgres' unique-violation into a 409 the UI can explain,
// rather than a 500 that reads as a server fault to the person who typed a
// duplicate email.
func conflictAware(err error) error {
	if strings.Contains(err.Error(), "alumni_profiles_email_unique") {
		return fiber.NewError(fiber.StatusConflict, "An alumnus with that email already exists.")
	}
	return err
}

func clamp(v, lo, hi int) int {
	return min(max(v, lo), hi)
}
