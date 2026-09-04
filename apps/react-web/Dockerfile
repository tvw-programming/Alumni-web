# ---------------------------------------------------------------------------
# Alumni web app — Vite dev server.
#
# The build context is the repository root, not this directory. That is forced
# by the alias in vite.config.ts: this app imports the shared components as
# source from libraries/archive/react-components/frontend/react/src, so a context of
# apps/react-web alone cannot see half of what it compiles.
#
# Only package.json is copied for the install layer; the source arrives by bind
# mount from compose, so editing a component on the Mac reloads the browser.
# ---------------------------------------------------------------------------

FROM node:22-bookworm-slim AS deps

WORKDIR /app

# No lockfile yet, so `npm install` rather than `npm ci`. Cached on the layer,
# which means it only reruns when package.json changes.
COPY apps/react-web/package.json ./
RUN --mount=type=cache,target=/root/.npm,sharing=locked \
    npm install --no-audit --no-fund


FROM deps AS dev

RUN apt-get update \
 && apt-get install -y --no-install-recommends curl tini \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY apps/react-web/ ./

ENV NODE_ENV=development \
    CHOKIDAR_USEPOLLING=true

EXPOSE 5174

HEALTHCHECK --interval=10s --timeout=3s --start-period=40s --retries=8 \
  CMD curl -fsS http://127.0.0.1:5174/ || exit 1

ENTRYPOINT ["/usr/bin/tini", "--"]
# --host or Vite binds to loopback inside the container and the Mac cannot reach it.
CMD ["npx", "vite", "--host", "0.0.0.0", "--port", "5174"]
