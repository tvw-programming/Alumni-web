# syntax=docker/dockerfile:1.7
#
# Mirrors the multi-stage pattern from react-gofiber-postgres-docker-best's
# frontend/Dockerfile (build with the JS toolchain, serve the static bundle
# with unprivileged nginx) — adapted for this app's package manager (pnpm,
# see pnpm-lock.yaml / pnpm-workspace.yaml) instead of npm.
FROM node:24-alpine AS build

WORKDIR /app
RUN corepack enable \
    && corepack prepare pnpm@9.15.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

COPY . .
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm build

FROM nginxinc/nginx-unprivileged:1.29-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080
