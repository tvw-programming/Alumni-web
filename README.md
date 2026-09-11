# Alumni Management — sample application

A worked example of the full stack: React consuming shared components, a Go
Fiber gateway, Firebase for identity and storage, Cloud Vision for moderation,
and PostgreSQL with raw SQL.

```
.
  src/          React app (Vite, dev server on port 5174)
  vendor/       shared React components, vendored as source
  api/          Go Fiber gateway
  db/
    migrations/ golang-migrate pairs, applied by the gateway at startup
    queries/    raw SQL, kept as .sql so EXPLAIN works without running the API
```

## The shared components are vendored as source

The upstream `react-components` library is private and publishes no `dist`, so
the components it exposes are checked in under `vendor/react-components/src` and
imported as source. That has one consequence that breaks first for anyone wiring
it up again: those components import each other through the library's own `@/`
alias. Aliasing `@ui` alone gets you a module that fails to resolve its own
imports.

So `vite.config.ts` and `tsconfig.json` both map:

| alias  | resolves to                                          |
|--------|------------------------------------------------------|
| `~/*`  | this app's `src`                                      |
| `@ui/*`| the vendored library's `src` — how this app names it    |
| `@/*`  | the vendored library's `src` — what it calls itself     |

The two files must agree, or the editor and the build will disagree.

## Running it

```bash
npm install
npm run dev                   # http://localhost:5174, fixture data

# Or the whole stack — React, gateway and Postgres — in Docker:
docker compose up -d --build
```

The React app serves fixture data unless `VITE_USE_FIXTURES=false`, so it renders
with nothing else running. Point it at a gateway with `VITE_API_TARGET`.

```bash
cd api && go run ./cmd/server # :8080, proxied at /api by vite
migrate -path db/migrations -database "$DATABASE_URL" up
```

## What is scaffolded vs. complete

Complete and verified: the schema and its indexes, the raw queries (checked with
EXPLAIN against Postgres 17 with 500 seeded rows), the Firebase auth middleware,
the signed-URL issuer, the Vision moderation service and its webhook, and the
React pieces listed below.

Left as stubs, because they are mechanical once the patterns above are settled:
the remaining CRUD handlers, `internal/repository/*` bodies, `internal/config`,
`cmd/server/main.go` wiring, and the routing shell in `src/routes`.

| Area | File |
|---|---|
| Social login + ID token | `src/lib/firebase.ts` |
| Authenticated API client | `src/api/client.ts` |
| AG-Grid admin table | `src/features/admin/AlumniAdminGrid.tsx` |
| Education domain form | `src/features/alumni/educationFormSchema.ts` |
| Swiper gallery, virtualised | `src/features/media/MediaGallery.tsx` |
| Firebase session validation | `api/internal/firebaseauth/middleware.go` |
| Signed upload URLs | `api/internal/storage/signed_url.go` |
| Vision moderation | `api/internal/moderation/vision.go` |
| Upload + webhook lifecycle | `api/internal/handler/media_handler.go` |
