# Go Fiber API documentation

Developer documentation for the Go Fiber backend in this repository. It
explains the current API architecture, how to call and extend it, and why its
implementation choices are appropriate for this application.

## Index

| Document                                                | Covers                                                                                                                                          |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| [Go Fiber backend API](features/gofiber-backend-api.md) | Architecture, endpoints, authentication, validation, pagination, uploads, operations, best-practice rationale, limitations, and extension guide |

## Intended audience

This documentation is for developers who need to consume, maintain, review, or
extend the API. It describes the implementation currently present in `api/`,
including the embedded versioned PostgreSQL migrations; `db/init/` remains the
new-volume bootstrap and seed layer.

## How decisions are presented

- **Implemented** describes current behavior.
- **Why this practice** explains the concrete benefit in this application.
- **Trade-off** records the cost or constraint created by the choice.
- **Recommended** identifies future work and must not be read as implemented.

Formal line-by-line evidence is intentionally omitted. Source locations are
included only as a navigation aid.

## Verification commands

```bash
cd api
go test ./...
go vet ./...

# Real PostgreSQL integration tests; requires Docker.
go test -tags=integration ./internal/integration

# From the repository root; also runs the pinned golangci-lint configuration.
make lint-api
```
