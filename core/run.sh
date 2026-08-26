#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Build the images, start the stack, wait until both services are healthy, and
# open the dashboard. Safe to run repeatedly.
# ---------------------------------------------------------------------------
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

AMBER='\033[38;5;179m'; RED='\033[38;5;203m'; DIM='\033[2m'; OFF='\033[0m'
say()  { printf "${AMBER}▸${OFF} %s\n" "$*"; }
warn() { printf "${RED}▸${OFF} %s\n" "$*"; }
die()  { warn "$*"; exit 1; }

UI_PORT="${CODEGEN_FRONTEND_PORT:-5173}"
API_PORT="${CODEGEN_API_PORT:-8000}"

# --- preflight --------------------------------------------------------------
command -v docker >/dev/null 2>&1 \
  || die "Docker is not installed. Get Docker Desktop: https://docker.com/products/docker-desktop"

docker compose version >/dev/null 2>&1 \
  || die "This needs Docker Compose v2. Update Docker Desktop and try again."

docker info >/dev/null 2>&1 \
  || die "Docker is installed but not running. Start Docker Desktop, then run this again."

for port in "${UI_PORT}" "${API_PORT}"; do
  if lsof -nP -iTCP:"${port}" -sTCP:LISTEN >/dev/null 2>&1; then
    die "Port ${port} is already in use. Free it, or set CODEGEN_FRONTEND_PORT / CODEGEN_API_PORT."
  fi
done

ARCH="$(uname -m)"
if [[ "${ARCH}" == "arm64" ]]; then
  say "Apple Silicon detected — building native arm64 images"
else
  warn "Host is ${ARCH}, not arm64. Building for ${CODEGEN_PLATFORM:-linux/arm64}."
  warn "Set CODEGEN_PLATFORM=linux/amd64 to avoid emulation."
fi

# Match the host user so the agent's edits stay editable outside the container.
export CODEGEN_UID="${CODEGEN_UID:-$(id -u)}"
export CODEGEN_GID="${CODEGEN_GID:-$(id -g)}"

[[ -f .env ]] || { cp .env.example .env; say "created .env from .env.example"; }

# --- build and start --------------------------------------------------------
say "building images ${DIM}(first run pulls base images — a few minutes)${OFF}"
docker compose build

say "starting"
docker compose up -d

# --- wait for health --------------------------------------------------------
say "waiting for the backend"
for i in $(seq 1 60); do
  if curl -fsS "http://localhost:${API_PORT}/api/health" >/dev/null 2>&1; then
    say "backend is up"
    break
  fi
  [[ $i -eq 60 ]] && {
    warn "the backend did not become healthy. Recent logs:"
    docker compose logs --tail=30 backend
    exit 1
  }
  sleep 2
done

say "waiting for the dashboard"
for i in $(seq 1 60); do
  if curl -fsS "http://localhost:${UI_PORT}/" >/dev/null 2>&1; then
    say "dashboard is up"
    break
  fi
  [[ $i -eq 60 ]] && {
    warn "the dashboard did not become healthy. Recent logs:"
    docker compose logs --tail=30 frontend
    exit 1
  }
  sleep 2
done

# --- report -----------------------------------------------------------------
STORY="${CODEGEN_STORY:-DEEP-2042}"
cat <<BANNER

  ${AMBER}CodeGen Core is running.${OFF}

    Dashboard   http://localhost:${UI_PORT}
    API         http://localhost:${API_PORT}/api/health
    Workspace   ./backend/sample-project  ${DIM}(the agent edits this — it is a git-tracked directory)${OFF}

  The dashboard is empty. Open it and press Start a run — give it a Jira
  story number, and either type the title/description/criteria or leave
  them blank to fetch from ${DIM}backend/stories/${STORY}.md${OFF} (the file tracker,
  active in this profile).

  Or from a terminal:  ${DIM}make run-story STORY=${STORY}${OFF}

    make logs     follow both services
    make down     stop, keep the run
    make clean    stop and delete the run

BANNER

# Open the browser on macOS; harmless everywhere else.
if command -v open >/dev/null 2>&1; then
  open "http://localhost:${UI_PORT}" 2>/dev/null || true
fi
