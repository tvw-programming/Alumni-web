# Alumni Management — sample application

A worked example of the platform's stack: React consuming the shared component
library, a Go Fiber gateway, Firebase for identity and storage, Cloud Vision for
moderation, and PostgreSQL with raw SQL.

```
apps/react-web/
  src/          React app (Vite, port 5174 — 5173 is the core run monitor)
  api/          Go Fiber gateway
  db/
    migrations/ golang-migrate pairs, same convention as libraries/archive/react-components/api
    queries/    raw SQL, kept as .sql so EXPLAIN works without running the API
```

## The shared components are consumed as source

`libraries/archive/react-components/frontend/react` is private and publishes no `dist`,
so this app imports its `src` directly. That has one consequence that breaks
first for anyone wiring it up again: those components import each other through
the library's own `@/` alias. Aliasing `@ui` alone gets you a module that fails
to resolve its own imports.

So `vite.config.ts` and `tsconfig.json` both map:

| alias  | resolves to                                          |
|--------|------------------------------------------------------|
| `~/*`  | this app's `src`                                      |
| `@ui/*`| the library's `src` — how this app names the library   |
| `@/*`  | the library's `src` — what the library calls itself    |

The two files must agree, or the editor and the build will disagree.

## Running it

```bash
cp .env.example .env          # Firebase web config
npm install
npm run dev                   # http://localhost:5174

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
