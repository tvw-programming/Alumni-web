# ---------------------------------------------------------------------------
# Alumni web app — Vite dev server.
#
# The build context is the repository root. The app imports the shared
# components as source from ./vendor/react-components, so everything it
# compiles lives inside this repository and the image is self-contained.
#
# Source is copied in rather than bind-mounted, so the image is reproducible:
# what you build is what runs, on any host.
# ---------------------------------------------------------------------------

FROM node:22-bookworm-slim AS deps

WORKDIR /app

# Package metadata only, so this layer is cached until a dependency changes.
# `npm ci` when a lockfile is present, `npm install` otherwise.
COPY package.json package-lock.json* ./
RUN --mount=type=cache,target=/root/.npm,sharing=locked \
    if [ -f package-lock.json ]; then npm ci --no-audit --no-fund; \
    else npm install --no-audit --no-fund; fi


FROM deps AS dev

RUN apt-get update \
 && apt-get install -y --no-install-recommends curl tini \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY index.html vite.config.ts tsconfig.json ./
COPY src ./src
COPY vendor ./vendor

ENV NODE_ENV=development \
    CHOKIDAR_USEPOLLING=true

EXPOSE 5174

HEALTHCHECK --interval=10s --timeout=3s --start-period=40s --retries=8 \
  CMD curl -fsS http://127.0.0.1:5174/ || exit 1

ENTRYPOINT ["/usr/bin/tini", "--"]
# --host or Vite binds to loopback inside the container and the host cannot reach it.
CMD ["npx", "vite", "--host", "0.0.0.0", "--port", "5174"]
