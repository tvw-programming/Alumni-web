#!/bin/sh
# VPS-side deployment with automatic rollback.
#
# Invoked by .github/workflows/ci-deploy.yml over SSH, after the workflow has
# rsynced the repository to APP_DIR. Runs entirely on the VPS: images are
# built here (ARM64) rather than pulled, so no registry is required.
#
# Rollback works by tagging the currently running images as :rollback before
# the rebuild overwrites :latest. Compose gives the built images those stable
# names via the `image:` keys in docker-compose.yaml.
#
# Manual run on the VPS:
#   cd /opt/idol-promo && sh ops/deploy.sh
set -eu

APP_DIR="${APP_DIR:-/opt/idol-promo}"
API_IMAGE_NAME="${API_IMAGE_NAME:-idol-promo-api}"
FRONTEND_IMAGE_NAME="${FRONTEND_IMAGE_NAME:-idol-promo-frontend}"
WAIT_TIMEOUT="${WAIT_TIMEOUT:-90}"

# Base stack + the production overlay that adds the TLS edge proxy. Override
# COMPOSE_FILES to deploy a different combination.
COMPOSE_FILES="${COMPOSE_FILES:--f docker-compose.yaml -f docker-compose.production.yaml}"

cd "$APP_DIR"

if [ ! -f .env ]; then
    echo "Missing $APP_DIR/.env — application secrets live only on the VPS." >&2
    exit 1
fi

# shellcheck disable=SC2086
compose() {
    docker compose $COMPOSE_FILES "$@"
}

# Tag the running images so they can be restored. Guarded with `if` rather
# than `&&`: under `set -e` a failing `a && b` list aborts the script, which
# would break the very first deployment (no :latest exists yet).
tag_rollback() {
    if docker image inspect "$1:latest" >/dev/null 2>&1; then
        docker tag "$1:latest" "$1:rollback"
        echo "Tagged $1:latest as $1:rollback"
    else
        echo "No existing $1:latest — nothing to roll back to"
    fi
}

restore_rollback() {
    if docker image inspect "$1:rollback" >/dev/null 2>&1; then
        docker tag "$1:rollback" "$1:latest"
        return 0
    fi
    echo "No $1:rollback image available" >&2
    return 1
}

tag_rollback "$API_IMAGE_NAME"
tag_rollback "$FRONTEND_IMAGE_NAME"

echo "Building application images"
compose build --pull api frontend

echo "Starting stack"
if compose up -d --remove-orphans --wait --wait-timeout "$WAIT_TIMEOUT"; then
    compose ps
    docker image prune -f >/dev/null 2>&1 || true
    echo "Deployment succeeded"
    exit 0
fi

echo "Deployment failed; restoring previous images" >&2
compose logs --tail 50 api frontend >&2 || true

if ! restore_rollback "$API_IMAGE_NAME" || ! restore_rollback "$FRONTEND_IMAGE_NAME"; then
    echo "Rollback images missing — stack left in its failed state for inspection." >&2
    exit 1
fi

compose up -d --no-build --force-recreate --wait --wait-timeout "$WAIT_TIMEOUT"
echo "Rolled back to the previous images" >&2
exit 1
