// Alumni gateway.
//
// Scope, stated plainly: this serves the alumni CRUD the admin screen needs,
// against Postgres, with the raw SQL from db/queries. It does NOT do Firebase
// session validation, signed uploads or Vision moderation — those packages
// exist in internal/ but are not wired here, because they need Google
// credentials this environment does not have.
//
// That makes it a development gateway. AUTH_MODE below is the switch, and it
// refuses to start unbolted unless someone says so out loud.
package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/example/alumni/api/internal/handler"
	"github.com/example/alumni/api/internal/migrate"
	"github.com/example/alumni/api/internal/repository"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	if err := run(logger); err != nil {
		logger.Error("gateway stopped", "error", err)
		os.Exit(1)
	}
}

func run(logger *slog.Logger) error {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	// An unauthenticated API is a decision, never a default. Anything other
	// than the explicit dev value stops the process rather than starting
	// something that looks finished and is not.
	authMode := env("AUTH_MODE", "")
	if authMode != "dev-no-auth" {
		return errors.New(
			"AUTH_MODE must be set to 'dev-no-auth': Firebase verification is not wired " +
				"into this build, so there is no authenticated mode to fall back to")
	}
	logger.Warn("running with authentication disabled", "auth_mode", authMode)

	pool, err := connect(ctx, env("DATABASE_URL", ""), logger)
	if err != nil {
		return err
	}
	defer pool.Close()

	applied, err := migrate.Run(ctx, pool, env("MIGRATIONS_DIR", "/app/db/migrations"))
	if err != nil {
		return fmt.Errorf("migrations: %w", err)
	}
	logger.Info("migrations up to date", "applied_now", applied)

	repo := repository.NewAlumniRepository(pool)
	alumni := handler.NewAlumniHandler(repo, logger)

	app := fiber.New(fiber.Config{
		AppName:      "alumni-gateway",
		ErrorHandler: errorHandler(logger),
		ReadTimeout:  15 * time.Second,
	})
	app.Use(recover.New())
	// The browser talks to Vite on 5174, which proxies here. CORS is for the
	// case where someone points the app straight at this port.
	app.Use(cors.New(cors.Config{AllowOrigins: env("CORS_ORIGINS", "http://localhost:5174")}))

	app.Get("/health", func(c *fiber.Ctx) error {
		if err := pool.Ping(c.UserContext()); err != nil {
			return fiber.NewError(fiber.StatusServiceUnavailable, "database unreachable")
		}
		return c.JSON(fiber.Map{"status": "ok", "auth": authMode})
	})

	v1 := app.Group("/api/v1")
	v1.Get("/alumni", alumni.List)
	v1.Post("/alumni", alumni.Create)
	v1.Put("/alumni/:id", alumni.Update)
	v1.Post("/alumni/bulk-delete", alumni.BulkDelete)
	v1.Post("/alumni/import", alumni.Import)

	addr := ":" + env("PORT", "8080")
	go func() {
		<-ctx.Done()
		logger.Info("shutting down")
		_ = app.ShutdownWithTimeout(10 * time.Second)
	}()

	logger.Info("listening", "addr", addr)
	return app.Listen(addr)
}

func connect(ctx context.Context, url string, logger *slog.Logger) (*pgxpool.Pool, error) {
	if url == "" {
		return nil, errors.New("DATABASE_URL is not set")
	}
	cfg, err := pgxpool.ParseConfig(url)
	if err != nil {
		return nil, fmt.Errorf("parsing DATABASE_URL: %w", err)
	}
	cfg.MaxConns = int32(atoiOr(env("DB_MAX_CONNS", "8"), 8))

	// Compose starts this alongside Postgres; "started" is not "accepting
	// connections", so the first few attempts are expected to fail.
	var pool *pgxpool.Pool
	for attempt := 1; attempt <= 10; attempt++ {
		pool, err = pgxpool.NewWithConfig(ctx, cfg)
		if err == nil && pool.Ping(ctx) == nil {
			return pool, nil
		}
		if pool != nil {
			pool.Close()
		}
		logger.Info("waiting for the database", "attempt", attempt)
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		case <-time.After(2 * time.Second):
		}
	}
	return nil, fmt.Errorf("database unreachable after 10 attempts: %w", err)
}

// errorHandler keeps the detail in the log and sends the client a shape it can
// rely on. A 500 whose body is a Go error string is how internals leak.
func errorHandler(logger *slog.Logger) fiber.ErrorHandler {
	return func(c *fiber.Ctx, err error) error {
		status := fiber.StatusInternalServerError
		message := "Something went wrong. The problem has been logged."

		var fe *fiber.Error
		if errors.As(err, &fe) {
			status, message = fe.Code, fe.Message
		}
		if status >= 500 {
			logger.Error("request failed", "path", c.Path(), "method", c.Method(), "error", err)
		}
		return c.Status(status).JSON(fiber.Map{"error": message})
	}
}

func env(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func atoiOr(s string, fallback int) int {
	n, err := strconv.Atoi(s)
	if err != nil {
		return fallback
	}
	return n
}
