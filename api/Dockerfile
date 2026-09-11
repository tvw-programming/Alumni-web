# ---------------------------------------------------------------------------
# Alumni gateway. Context is the repository root, because the image needs both
# the Go module (./api) and db/migrations, which the service applies at startup.
# ---------------------------------------------------------------------------
FROM golang:1.26-alpine AS build

WORKDIR /src
# Module files first, so a source edit does not re-download the world.
COPY api/go.mod api/go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod go mod download

COPY api/ ./
# Static: the runtime stage has no libc to link against.
RUN --mount=type=cache,target=/go/pkg/mod --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/server ./cmd/server


FROM alpine:3.20 AS runtime

RUN apk add --no-cache curl tini ca-certificates \
 && adduser -D -u 10001 alumni

WORKDIR /app
COPY --from=build /out/server /app/server
# Applied at startup by internal/migrate, so a fresh database is usable without
# a separate migration step.
COPY db/migrations /app/db/migrations

USER alumni
EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=6 \
  CMD curl -fsS http://127.0.0.1:8080/health || exit 1

ENTRYPOINT ["/sbin/tini", "--", "/app/server"]
