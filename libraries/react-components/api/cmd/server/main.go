package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"os/signal"
	"strconv"
	"sync/atomic"
	"syscall"
	"time"

	"github.com/gofiber/contrib/otelfiber/v2"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/limiter"

	"github.com/example/idol-promo/api/internal/apperror"
	"github.com/example/idol-promo/api/internal/auth"
	"github.com/example/idol-promo/api/internal/background"
	"github.com/example/idol-promo/api/internal/config"
	"github.com/example/idol-promo/api/internal/database"
	"github.com/example/idol-promo/api/internal/handler"
	"github.com/example/idol-promo/api/internal/idempotency"
	appmiddleware "github.com/example/idol-promo/api/internal/middleware"
	"github.com/example/idol-promo/api/internal/migrations"
	"github.com/example/idol-promo/api/internal/observability"
	"github.com/example/idol-promo/api/internal/openapi"
	"github.com/example/idol-promo/api/internal/repository"
	"github.com/example/idol-promo/api/internal/upload"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	if err := run(logger); err != nil {
		logger.Error("API stopped", "error", err)
		os.Exit(1)
	}
}

func run(logger *slog.Logger) error {
	cfg, loadErr := config.Load()
	if loadErr != nil {
		return fmt.Errorf("load configuration: %w", loadErr)
	}

	db, sqlDB, databaseErr := database.Open(cfg.Database, logger)
	if databaseErr != nil {
		return fmt.Errorf("open database: %w", databaseErr)
	}
	defer func() {
		if closeErr := sqlDB.Close(); closeErr != nil {
			logger.Error("database close failed", "error", closeErr)
		}
	}()
	if migrationErr := migrations.Apply(sqlDB); migrationErr != nil {
		return fmt.Errorf("apply database migrations: %w", migrationErr)
	}

	var telemetry *observability.Providers
	if cfg.Observability.Enabled {
		configuredTelemetry, setupErr := observability.Setup(
			context.Background(), cfg.Observability.ServiceName)
		if setupErr != nil {
			return fmt.Errorf("set up telemetry: %w", setupErr)
		}
		telemetry = configuredTelemetry
		defer func() {
			shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			defer cancel()
			if telemetryErr := telemetry.Shutdown(shutdownCtx); telemetryErr != nil {
				logger.Error("telemetry shutdown failed", "error", telemetryErr)
			}
		}()
	}

	app := fiber.New(fiber.Config{
		AppName:      "Items API",
		ErrorHandler: appmiddleware.ErrorHandler(logger),
		BodyLimit:    cfg.MaxRequestBodySize,
	})
	app.Use(appmiddleware.RequestID())
	if cfg.Observability.Enabled {
		app.Use(otelfiber.Middleware(
			otelfiber.WithTracerProvider(telemetry.Tracer),
			otelfiber.WithMeterProvider(telemetry.Meter),
		))
	}
	app.Use(appmiddleware.RequestLogger(logger))
	app.Use(appmiddleware.Recover(logger))

	itemRepository := repository.NewItemRepository(db)
	itemHandler := handler.NewItemHandler(itemRepository, cfg.RequestTimeout)

	userRepository := repository.NewUserRepository(db)
	tokenIssuer := auth.NewTokenIssuer(cfg.Auth.JWTSecret, cfg.Auth.Issuer, cfg.Auth.AccessTokenTTL)
	authService := auth.NewService(
		userRepository, tokenIssuer, cfg.Auth.SessionTTL, cfg.Auth.RememberMeTTL)
	authHandler := handler.NewAuthHandler(
		authService, cfg.RequestTimeout, cfg.Auth.SecureCookies, cfg.Auth.ResetURLBase, cfg.Auth.DevMode)

	if cfg.Auth.DevMode {
		logger.Warn("auth running in development mode: " +
			"a built-in signing key is in use and password-reset links are returned in responses")
	}

	uploadStore, uploadErr := upload.NewStore(cfg.Uploads.Root, cfg.Uploads.PublicURL)
	if uploadErr != nil {
		return fmt.Errorf("open upload store: %w", uploadErr)
	}
	productRepository := repository.NewProductRepository(db)
	auditRepository := repository.NewAuditRepository(db)
	idempotencyStore := idempotency.NewStore(db)
	productHandler := handler.NewProductHandler(productRepository, uploadStore, cfg.RequestTimeout)

	workerCtx, stopWorkers := context.WithCancel(context.Background())
	workersDone := make(chan struct{})
	if cfg.Background.Enabled {
		hostname, hostnameErr := os.Hostname()
		if hostnameErr != nil {
			hostname = "unknown-host"
		}
		jobRepository := background.NewRepository(db)
		worker := background.NewWorker(
			jobRepository,
			hostname+":"+strconv.Itoa(os.Getpid()),
			map[string]background.Handler{
				background.MaintenanceKind: background.MaintenanceHandler(db),
			},
			cfg.Background.PollInterval,
			cfg.Background.JobTimeout,
			logger,
		)
		go func() {
			defer close(workersDone)
			worker.Run(workerCtx)
		}()
		go background.ScheduleMaintenance(
			workerCtx, jobRepository, cfg.Background.MaintenanceInterval, logger)
	} else {
		close(workersDone)
	}

	var startupComplete atomic.Bool
	app.Get("/livez", handler.Live)
	app.Get("/readyz", handler.Health(sqlDB, cfg.RequestTimeout))
	app.Get("/startupz", handler.Startup(startupComplete.Load))
	app.Get("/health", handler.Health(sqlDB, cfg.RequestTimeout))
	app.Use(openapi.Handler())
	app.Get("/api/items", itemHandler.List)

	// Uploaded files. Served before the auth-gated routes because an <img> tag
	// cannot send an Authorization header.
	app.Static(cfg.Uploads.PublicURL, cfg.Uploads.Root, fiber.Static{
		Browse:    false,
		ByteRange: true,
		MaxAge:    3600,
	})

	/*
	 * Products.
	 *
	 * Reads are open so the grid renders without a session; writes require one.
	 * That split is deliberate rather than uniform: this is the showcase data,
	 * and gating reads would make every public page require a login.
	 */
	products := app.Group("/api/products")
	products.Get("/", productHandler.List)
	products.Get("/:id", productHandler.Get)
	idempotencyScope := func(c *fiber.Ctx) string {
		if claims, ok := handler.ClaimsFrom(c); ok {
			return "user:" + strconv.FormatUint(claims.UserID, 10)
		}
		return "anonymous:" + c.IP()
	}
	products.Post("/", handler.RequireAuth(tokenIssuer),
		handler.RequirePermission(handler.PermissionProductCreate),
		idempotency.Middleware(
			idempotencyStore, logger, cfg.RequestTimeout, 24*time.Hour, idempotencyScope),
		handler.AuditMutation(auditRepository, logger, cfg.RequestTimeout, "product.create", "product"),
		productHandler.Create)
	products.Patch("/:id", handler.RequireAuth(tokenIssuer),
		handler.RequirePermission(handler.PermissionProductUpdate),
		handler.AuditMutation(auditRepository, logger, cfg.RequestTimeout, "product.update", "product"),
		productHandler.Update)
	products.Delete("/:id",
		handler.RequireAuth(tokenIssuer),
		handler.RequirePermission(handler.PermissionProductDelete),
		handler.AuditMutation(auditRepository, logger, cfg.RequestTimeout, "product.delete", "product"),
		productHandler.Delete)

	// Per-IP throttle on the credential endpoints.
	//
	// This is the network-level companion to the per-account lockout in the auth
	// service: the lockout stops one account being ground down, this stops one
	// source spraying many accounts. Neither alone is enough.
	credentialLimiter := limiter.New(limiter.Config{
		Max:        10,
		Expiration: time.Minute,
		KeyGenerator: func(c *fiber.Ctx) string {
			return c.IP()
		},
		LimitReached: func(c *fiber.Ctx) error {
			return apperror.New(fiber.StatusTooManyRequests, "RATE_LIMITED",
				"Too many attempts. Please wait a minute and try again.", nil)
		},
	})

	authRoutes := app.Group("/api/auth")
	authRoutes.Post("/login", credentialLimiter, authHandler.Login)
	authRoutes.Post("/forgot-password", credentialLimiter, authHandler.ForgotPassword)
	authRoutes.Post("/reset-password", credentialLimiter, authHandler.ResetPassword)
	// Not throttled by the same budget: a refresh is a normal background action
	// for a signed-in user, and rate-limiting it would sign people out.
	authRoutes.Post("/refresh", authHandler.Refresh)
	authRoutes.Post("/logout", authHandler.Logout)
	authRoutes.Get("/me", handler.RequireAuth(tokenIssuer), authHandler.Me)
	startupComplete.Store(true)

	app.Use(func(c *fiber.Ctx) error {
		return fiber.ErrNotFound
	})

	serverErrors := make(chan error, 1)
	go func() {
		logger.Info("API listening", "address", cfg.ListenAddress)
		serverErrors <- app.Listen(cfg.ListenAddress)
	}()

	shutdownSignal := make(chan os.Signal, 1)
	signal.Notify(shutdownSignal, syscall.SIGINT, syscall.SIGTERM)
	defer signal.Stop(shutdownSignal)

	var serveErr error
	select {
	case sig := <-shutdownSignal:
		logger.Info("shutdown signal received", "signal", sig.String())
	case listenErr := <-serverErrors:
		if listenErr != nil {
			serveErr = fmt.Errorf("serve HTTP: %w", listenErr)
		}
	}

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if shutdownErr := app.ShutdownWithContext(shutdownCtx); shutdownErr != nil {
		serveErr = errors.Join(serveErr, fmt.Errorf("graceful HTTP shutdown: %w", shutdownErr))
	}
	stopWorkers()
	select {
	case <-workersDone:
	case <-shutdownCtx.Done():
		logger.Error("background worker shutdown timed out")
	}
	return serveErr
}
