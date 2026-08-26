# syntax=docker/dockerfile:1.7

# ---------------------------------------------------------------------------
# CodeGen Core run monitor — React + MUI, served by Vite.
#
# `dev` is the default target: it runs the Vite dev server against a bind mount
# so edits on the Mac reload in the browser. `prod` builds static assets and
# serves them with nginx, for when you want the production bundle instead.
# ---------------------------------------------------------------------------

FROM node:22-bookworm-slim AS deps

WORKDIR /app

# Install from the lockfile alone, so dependencies cache independently of source.
COPY frontend/package.json frontend/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm,sharing=locked \
    npm ci --no-audit --no-fund


# --- development ------------------------------------------------------------
FROM deps AS dev

# curl is the healthcheck; tini keeps ctrl-C from leaving node behind.
RUN apt-get update \
 && apt-get install -y --no-install-recommends curl tini \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY frontend/ ./

ENV NODE_ENV=development \
    CHOKIDAR_USEPOLLING=true \
    WATCHPACK_POLLING=true

EXPOSE 5173

HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=6 \
  CMD curl -fsS http://127.0.0.1:5173/ || exit 1

ENTRYPOINT ["/usr/bin/tini", "--"]
# --host is required or Vite binds to loopback inside the container and the
# Mac cannot reach it.
CMD ["npx", "vite", "--host", "0.0.0.0", "--port", "5173"]


# --- production -------------------------------------------------------------
FROM deps AS build

WORKDIR /app
COPY frontend/ ./
ARG VITE_API_BASE=http://localhost:8000
ENV VITE_API_BASE=${VITE_API_BASE}
RUN npm run build


FROM nginx:1.27-alpine AS prod

COPY --from=build /app/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=5 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
