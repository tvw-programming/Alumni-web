//go:build integration

package integration_test

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/lib/pq"
	"github.com/shopspring/decimal"
	"github.com/testcontainers/testcontainers-go"
	tcpostgres "github.com/testcontainers/testcontainers-go/modules/postgres"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	"github.com/example/idol-promo/api/internal/auth"
	"github.com/example/idol-promo/api/internal/background"
	"github.com/example/idol-promo/api/internal/idempotency"
	appmiddleware "github.com/example/idol-promo/api/internal/middleware"
	"github.com/example/idol-promo/api/internal/migrations"
	"github.com/example/idol-promo/api/internal/model"
	"github.com/example/idol-promo/api/internal/repository"
)

func openDatabase(t *testing.T) *gorm.DB {
	t.Helper()
	ctx, cancel := context.WithTimeout(context.Background(), 90*time.Second)
	t.Cleanup(cancel)

	container, err := tcpostgres.Run(ctx, "postgres:17-alpine",
		tcpostgres.WithDatabase("idol_test"),
		tcpostgres.WithUsername("idol_test"),
		tcpostgres.WithPassword("idol_test_password"),
		tcpostgres.BasicWaitStrategies(),
	)
	if err != nil {
		t.Fatalf("start PostgreSQL container: %v", err)
	}
	testcontainers.CleanupContainer(t, container)

	dsn, err := container.ConnectionString(ctx, "sslmode=disable")
	if err != nil {
		t.Fatalf("PostgreSQL connection string: %v", err)
	}
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		t.Fatalf("open GORM: %v", err)
	}
	sqlDB, err := db.DB()
	if err != nil {
		t.Fatalf("open sql.DB: %v", err)
	}
	t.Cleanup(func() { _ = sqlDB.Close() })
	if err := migrations.Apply(sqlDB); err != nil {
		t.Fatalf("apply migrations: %v", err)
	}
	if err := migrations.Apply(sqlDB); err != nil {
		t.Fatalf("reapply no-change migrations: %v", err)
	}
	return db
}

func TestProductOptimisticConcurrency(t *testing.T) {
	db := openDatabase(t)
	repo := repository.NewProductRepository(db)
	ctx := context.Background()
	product := &model.Product{
		ProductID:            "SKU-IT-001",
		ProductName:          "Integration product",
		Description:          "Created by an integration test.",
		Price:                decimal.RequireFromString("19.99"),
		ReleaseDate:          time.Now().UTC(),
		Condition:            "new",
		Availability:         "inStock",
		ShippingRegions:      []string{"na"},
		Tags:                 pq.StringArray{},
		ProductDocumentPaths: pq.StringArray{},
		AcceptTerms:          true,
		Category:             "electronics",
	}
	if err := repo.Create(ctx, product); err != nil {
		t.Fatalf("create product: %v", err)
	}

	version := product.Version
	updated, err := repo.Update(ctx, product.ID, &version, map[string]any{"product_name": "First writer"})
	if err != nil {
		t.Fatalf("first update: %v", err)
	}
	if updated.Version != version+1 {
		t.Fatalf("updated version = %d, want %d", updated.Version, version+1)
	}

	_, err = repo.Update(ctx, product.ID, &version, map[string]any{"product_name": "Stale writer"})
	if !errors.Is(err, repository.ErrVersionConflict) {
		t.Fatalf("stale update error = %v, want ErrVersionConflict", err)
	}

	deleted, err := repo.Delete(ctx, product.ID, &updated.Version)
	if err != nil {
		t.Fatalf("delete current version: %v", err)
	}
	if deleted.ID != product.ID || deleted.ProductName != "First writer" {
		t.Fatalf("deleted row = %+v", deleted)
	}
}

func TestBackgroundJobClaimIsUnique(t *testing.T) {
	db := openDatabase(t)
	repo := background.NewRepository(db)
	ctx := context.Background()
	key := "integration-maintenance"

	if err := repo.EnqueueUnique(ctx, "integration.test", &key, map[string]string{"value": "one"}, time.Now(), 3); err != nil {
		t.Fatalf("enqueue first job: %v", err)
	}
	if err := repo.EnqueueUnique(ctx, "integration.test", &key, map[string]string{"value": "duplicate"}, time.Now(), 3); err != nil {
		t.Fatalf("enqueue duplicate job: %v", err)
	}

	job, err := repo.Claim(ctx, "integration-worker", time.Now())
	if err != nil {
		t.Fatalf("claim job: %v", err)
	}
	if job.Attempts != 1 || job.State != "running" {
		t.Fatalf("claimed job = %+v", job)
	}
	if _, err := repo.Claim(ctx, "other-worker", time.Now()); !errors.Is(err, background.ErrNoRunnableJob) {
		t.Fatalf("second claim error = %v, want ErrNoRunnableJob", err)
	}
}

func TestAuthTransactionsSerializeTokenConsumption(t *testing.T) {
	db := openDatabase(t)
	ctx := context.Background()
	passwordHash, err := auth.HashPassword("correct horse battery staple")
	if err != nil {
		t.Fatalf("hash password: %v", err)
	}
	user := &model.User{
		Email:        "refresh@example.test",
		PasswordHash: passwordHash,
		DisplayName:  "Refresh Test",
		Role:         model.RoleUser,
		IsActive:     true,
	}
	if err := db.WithContext(ctx).Create(user).Error; err != nil {
		t.Fatalf("create user: %v", err)
	}

	users := repository.NewUserRepository(db)
	issuer := auth.NewTokenIssuer([]byte(strings.Repeat("k", 32)), "integration", time.Minute)
	service := auth.NewService(users, issuer, time.Hour, 30*24*time.Hour)
	session, err := service.Login(ctx, auth.LoginInput{
		Email: "refresh@example.test", Password: "correct horse battery staple",
	})
	if err != nil {
		t.Fatalf("login: %v", err)
	}

	results := make(chan error, 2)
	start := make(chan struct{})
	var group sync.WaitGroup
	for range 2 {
		group.Add(1)
		go func() {
			defer group.Done()
			<-start
			_, refreshErr := service.Refresh(ctx, session.RefreshToken, "integration", "127.0.0.1")
			results <- refreshErr
		}()
	}
	close(start)
	group.Wait()
	close(results)

	successes := 0
	failures := 0
	for refreshErr := range results {
		if refreshErr == nil {
			successes++
		} else {
			failures++
		}
	}
	if successes != 1 || failures != 1 {
		t.Fatalf("refresh results: successes=%d failures=%d, want 1 and 1", successes, failures)
	}

	firstReset, _, err := service.RequestPasswordReset(ctx, user.Email)
	if err != nil {
		t.Fatalf("first password-reset request: %v", err)
	}
	secondReset, _, err := service.RequestPasswordReset(ctx, user.Email)
	if err != nil {
		t.Fatalf("second password-reset request: %v", err)
	}
	if err := service.ResetPassword(ctx, firstReset, "a new secure passphrase"); err == nil {
		t.Fatal("superseded reset token was accepted")
	}
	if err := service.ResetPassword(ctx, secondReset, "a new secure passphrase"); err != nil {
		t.Fatalf("latest reset token: %v", err)
	}

	wrongPasswordStart := make(chan struct{})
	var wrongPasswordGroup sync.WaitGroup
	for range auth.MaxFailedAttempts {
		wrongPasswordGroup.Add(1)
		go func() {
			defer wrongPasswordGroup.Done()
			<-wrongPasswordStart
			_, _ = service.Login(ctx, auth.LoginInput{
				Email: user.Email, Password: "definitely the wrong password",
			})
		}()
	}
	close(wrongPasswordStart)
	wrongPasswordGroup.Wait()

	var lockedUser model.User
	if err := db.WithContext(ctx).First(&lockedUser, user.ID).Error; err != nil {
		t.Fatalf("reload locked user: %v", err)
	}
	if lockedUser.FailedLoginAttempts != auth.MaxFailedAttempts || !lockedUser.Locked(time.Now()) {
		t.Fatalf("lockout state = attempts %d, locked until %v",
			lockedUser.FailedLoginAttempts, lockedUser.LockedUntil)
	}
}

func TestIdempotencyReplaysSuccessfulResponse(t *testing.T) {
	db := openDatabase(t)
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	app := fiber.New(fiber.Config{ErrorHandler: appmiddleware.ErrorHandler(logger)})
	store := idempotency.NewStore(db)
	calls := 0
	app.Post("/resource",
		idempotency.Middleware(store, logger, time.Second, time.Hour,
			func(*fiber.Ctx) string { return "integration-user" }),
		func(c *fiber.Ctx) error {
			calls++
			c.Set(fiber.HeaderETag, `"1"`)
			return c.Status(http.StatusCreated).JSON(fiber.Map{"call": calls})
		},
	)

	request := func(key, body string) *http.Response {
		req := httptest.NewRequestWithContext(
			t.Context(), http.MethodPost, "/resource", strings.NewReader(body))
		req.Header.Set(idempotency.Header, key)
		req.Header.Set(fiber.HeaderContentType, fiber.MIMEApplicationJSON)
		response, err := app.Test(req)
		if err != nil {
			t.Fatalf("request: %v", err)
		}
		_ = response.Body.Close()
		return response
	}

	first := request("integration-key-001", `{"value":"same"}`)
	second := request("integration-key-001", `{"value":"same"}`)
	if first.StatusCode != http.StatusCreated || second.StatusCode != http.StatusCreated {
		t.Fatalf("replay statuses = %d and %d", first.StatusCode, second.StatusCode)
	}
	if calls != 1 {
		t.Fatalf("handler calls = %d, want 1", calls)
	}
	if second.Header.Get(fiber.HeaderETag) != `"1"` {
		t.Fatalf("replayed ETag = %q, want %q", second.Header.Get(fiber.HeaderETag), `"1"`)
	}
	conflict := request("integration-key-001", `{"value":"different"}`)
	if conflict.StatusCode != http.StatusConflict {
		t.Fatalf("different-body status = %d, want 409", conflict.StatusCode)
	}

	expired := &idempotency.Record{
		Scope: "integration-user:POST:/resource", IdempotencyKey: "expired-key-001",
		RequestHash: strings.Repeat("0", 64), State: "processing", ExpiresAt: time.Now().Add(-time.Minute),
	}
	if err := db.Create(expired).Error; err != nil {
		t.Fatalf("create expired idempotency record: %v", err)
	}
	reused := request("expired-key-001", `{"value":"new"}`)
	if reused.StatusCode != http.StatusCreated || calls != 2 {
		t.Fatalf("expired-key reuse status=%d calls=%d, want 201 and 2", reused.StatusCode, calls)
	}
}
