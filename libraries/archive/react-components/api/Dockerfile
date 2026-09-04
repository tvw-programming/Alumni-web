FROM golang:1.26.5-alpine AS build

WORKDIR /src

COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod go mod download

COPY . .

RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    go test ./...

RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 GOOS=linux \
    go build -trimpath -ldflags="-s -w" -o /out/api ./cmd/server

FROM alpine:3.22

RUN apk add --no-cache ca-certificates tzdata \
    && addgroup -S app \
    && adduser -S -G app app

COPY --from=build /out/api /usr/local/bin/api

# The upload root must exist *in the image*, owned by the app user. Docker seeds
# a fresh named volume from the image's directory — including its ownership — so
# creating it here is what makes the mounted volume writable by an unprivileged
# process. Without it the mount point arrives owned by root and every upload
# fails with "permission denied".
RUN mkdir -p /var/lib/idol-promo/uploads \
    && chown -R app:app /var/lib/idol-promo

USER app
EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/api"]