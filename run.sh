#!/usr/bin/env bash
# run.sh — run the stack without Docker: Postgres, the Go gateway, the Vite app.
#
#   ./run.sh                        # full stack; the app serves fixture data
#   ALUMNI_FIXTURES=false ./run.sh  # point the app at the real gateway
#
# Same env vars as docker-compose.yml: ALUMNI_DB_NAME/USER/PASSWORD/PORT,
# ALUMNI_API_PORT, ALUMNI_PORT, ALUMNI_FIXTURES, DATABASE_URL.
set -euo pipefail
cd "$(dirname "$0")"
ROOT="$PWD"

ALUMNI_DB_NAME="${ALUMNI_DB_NAME:-alumni}"
ALUMNI_DB_USER="${ALUMNI_DB_USER:-alumni}"
ALUMNI_DB_PASSWORD="${ALUMNI_DB_PASSWORD:-alumni-dev-only}"
# Compose maps the container to host 5434; native Postgres listens on 5432.
ALUMNI_DB_PORT="${ALUMNI_DB_PORT:-5432}"
ALUMNI_API_PORT="${ALUMNI_API_PORT:-8080}"
ALUMNI_PORT="${ALUMNI_PORT:-5174}"
ALUMNI_FIXTURES="${ALUMNI_FIXTURES:-true}"
DATABASE_URL="${DATABASE_URL:-postgres://$ALUMNI_DB_USER:$ALUMNI_DB_PASSWORD@127.0.0.1:$ALUMNI_DB_PORT/$ALUMNI_DB_NAME?sslmode=disable}"

log()  { printf '\033[1;36m[run]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[run]\033[0m %s\n' "$*"; }

PIDS=()
cleanup() {
  local pid
  for pid in ${PIDS[@]:-}; do kill "$pid" 2>/dev/null || true; done
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

db_listening() { (exec 3<>"/dev/tcp/127.0.0.1/$ALUMNI_DB_PORT") 2>/dev/null; }
wait_for_db() {
  local i
  for i in $(seq 1 15); do
    db_listening && return 0
    sleep 1
  done
  return 1
}

# Compose creates the role and database via POSTGRES_* env; natively this only
# works over the local socket, which Homebrew Postgres trusts for the OS user.
bootstrap_db() {
  if ! psql -p "$ALUMNI_DB_PORT" -d postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='$ALUMNI_DB_USER'" | grep -q 1; then
    psql -p "$ALUMNI_DB_PORT" -d postgres -c "CREATE ROLE \"$ALUMNI_DB_USER\" LOGIN PASSWORD '$ALUMNI_DB_PASSWORD';"
  fi
  if ! psql -p "$ALUMNI_DB_PORT" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$ALUMNI_DB_NAME'" | grep -q 1; then
    psql -p "$ALUMNI_DB_PORT" -d postgres -c "CREATE DATABASE \"$ALUMNI_DB_NAME\" OWNER \"$ALUMNI_DB_USER\";"
  fi
}

db_ready=0
if db_listening; then
  db_ready=1
else
  started=""
  if command -v brew >/dev/null 2>&1; then
    for formula in postgresql@17 postgresql@16 postgresql@14 postgresql; do
      if brew list --versions "$formula" >/dev/null 2>&1; then
        log "starting $formula via brew services"
        brew services start "$formula" || true
        started="$formula"
        break
      fi
    done
  fi
  if wait_for_db; then
    db_ready=1
  else
    [ -n "$started" ] && warn "$started did not open a listener on :$ALUMNI_DB_PORT"
    warn "no Postgres on :$ALUMNI_DB_PORT — starting the app on fixture data only"
    warn "for the full stack: brew install postgresql@17 && brew services start postgresql@17"
    warn "or point ALUMNI_DB_PORT (and DATABASE_URL, if needed) at a running instance"
  fi
fi

if [ "$db_ready" = 1 ] && command -v psql >/dev/null 2>&1; then
  if PGPASSWORD="$ALUMNI_DB_PASSWORD" psql -h 127.0.0.1 -p "$ALUMNI_DB_PORT" -U "$ALUMNI_DB_USER" -d "$ALUMNI_DB_NAME" -tAc 'SELECT 1' >/dev/null 2>&1; then
    log "database $ALUMNI_DB_NAME is reachable on :$ALUMNI_DB_PORT"
  else
    bootstrap_db || warn "could not create the role/database automatically — create '$ALUMNI_DB_USER' and '$ALUMNI_DB_NAME' manually"
  fi
fi

if [ "$db_ready" = 1 ]; then
  if command -v go >/dev/null 2>&1; then
    log "starting gateway on :$ALUMNI_API_PORT"
    (
      cd api
      # MIGRATIONS_DIR defaults to the container path /app/db/migrations.
      exec env \
        AUTH_MODE=dev-no-auth \
        DATABASE_URL="$DATABASE_URL" \
        MIGRATIONS_DIR="$ROOT/db/migrations" \
        CORS_ORIGINS="http://localhost:$ALUMNI_PORT" \
        PORT="$ALUMNI_API_PORT" \
        go run ./cmd/server
    ) &
    PIDS+=("$!")
  else
    warn "go is not installed — skipping the gateway (brew install go)"
  fi
fi

if [ ! -d node_modules ]; then
  log "installing npm dependencies"
  npm install --no-audit --no-fund
fi

log "starting web on :$ALUMNI_PORT (VITE_USE_FIXTURES=$ALUMNI_FIXTURES)"
VITE_USE_FIXTURES="$ALUMNI_FIXTURES" VITE_API_TARGET="http://localhost:$ALUMNI_API_PORT" \
  exec node_modules/.bin/vite --port "$ALUMNI_PORT" &
PIDS+=("$!")

wait
