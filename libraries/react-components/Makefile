GOLANGCI_VERSION ?= v2.12.2
# Run golangci-lint from its pinned image so a local run and CI agree without
# anyone having to install the binary. Override with GOLANGCI=golangci-lint to
# use a local install instead.
GOLANGCI ?= docker run --rm \
	-v "$(CURDIR)/api":/app -w /app \
	-v idol-golangci-mod:/go/pkg/mod \
	-v idol-golangci-cache:/root/.cache \
	golangci/golangci-lint:$(GOLANGCI_VERSION)-alpine golangci-lint

.PHONY: dev dev-react down logs test test-api test-api-integration test-frontend test-react test-angular coverage \
	lint lint-api lint-frontend lint-react lint-angular \
	fmt fmt-api fmt-frontend check build-frontend

## Both frontends at once: React on :8090, Angular on :8092.
dev:
	docker compose --profile angular \
		-f docker-compose.yaml -f docker-compose.dev.yaml up --build

## The React frontend only, as `make dev` behaved before the Angular app landed.
dev-react:
	docker compose -f docker-compose.yaml -f docker-compose.dev.yaml up --build

# `--profile angular` so the Angular container comes down too; without it a
# profile-gated service can be left running as an orphan.
down:
	docker compose --profile angular down

logs:
	docker compose --profile angular logs -f

test: test-api test-frontend

test-api:
	cd api && go test ./...

## Requires a working Docker daemon; starts an isolated PostgreSQL 17 container.
test-api-integration:
	cd api && go test -tags=integration ./internal/integration

## Both frontends. `frontend/` holds two apps implementing the same product.
test-frontend: test-react test-angular

test-react:
	cd frontend/react && pnpm test

test-angular:
	cd frontend/angular && pnpm test

coverage:
	cd api && go test -coverprofile=coverage.out ./... && go tool cover -func=coverage.out | tail -1
	cd frontend/react && pnpm test:coverage

## Report problems without changing anything.
lint: lint-api lint-frontend

lint-api:
	$(GOLANGCI) run
	$(GOLANGCI) fmt --diff

lint-frontend: lint-react lint-angular

lint-react:
	cd frontend/react && pnpm lint

lint-angular:
	cd frontend/angular && pnpm lint

## Apply every fix the tools can make on their own.
fmt: fmt-api fmt-frontend

fmt-api:
	$(GOLANGCI) fmt

fmt-frontend:
	cd frontend/react && pnpm lint:fix && pnpm format

build-frontend:
	cd frontend/react && pnpm build
	cd frontend/angular && pnpm build

## What CI runs.
check: lint test build-frontend
