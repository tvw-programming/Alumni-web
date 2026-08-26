# syntax=docker/dockerfile:1.7
#
# Same multi-stage shape as frontend/react/Dockerfile — build with the JS
# toolchain, serve the static bundle from unprivileged nginx — with two
# differences that are not cosmetic:
#
#   1. node:26, not node:24. The Angular 22 CLI declares
#      `^22.22.3 || ^24.15.0 || >=26.0.0`, and node:24-alpine currently
#      resolves to 24.14.x, which the CLI refuses to run on. `.node-version`
#      pins the same major for local work.
#   2. The build output is `dist/angular/browser`, not `dist`.
FROM node:26-alpine AS build

WORKDIR /app
# `npm i -g`, not `corepack`: corepack was unbundled from the Node images at
# 25, so the React app's `corepack prepare` line does not work on node:26.
RUN npm install -g pnpm@11.13.1

# `pnpm-workspace.yaml` is not declaring a workspace here — it carries the
# `onlyBuiltDependencies` allow-list, which pnpm 10+ reads only from that file.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

COPY . .
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm build

FROM nginxinc/nginx-unprivileged:1.29-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/angular/browser /usr/share/nginx/html

EXPOSE 8080
