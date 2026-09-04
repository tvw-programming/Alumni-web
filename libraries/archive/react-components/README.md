# Items application

A production-oriented monolithic repository containing:

- a Go Fiber REST API with GORM and a tuned PostgreSQL connection pool;
- **two** frontends implementing the same product, for comparison: React 19 +
  TypeScript + MUI, and Angular 22 + Material + Signals;
- embedded, versioned PostgreSQL migrations plus initialization and seed data;
- small multi-stage Docker images and Docker Compose orchestration;
- centralized API errors, request IDs, structured logs, health checks, and graceful shutdown.

The browser only connects to the frontend. Nginx serves the React build — the
frontend behind the edge proxy — and proxies
`/api/*` to the private API container. PostgreSQL is isolated on an internal Docker
network and is not published to the host.

## Project layout

```text
.
├── api/                          Go Fiber API
│   ├── cmd/server/               application entrypoint
│   ├── internal/                 config, database, handlers, middleware, models, repository
│   ├── documentation/            backend architecture and feature documentation
│   └── .golangci.yml             lint rules
├── api-spring/                   Spring Boot port of the same API — 7 files, opt-in
│                                 (`docker compose --profile spring up -d --build api-spring`)
├── db/init/                      PostgreSQL initialization SQL
├── frontend/
│   ├── react/                    React 19 + TypeScript + MUI app, Nginx config, tests
│   │                             docs in react/documentation/
│   └── angular/                  Angular 22 + Material + AG Grid app (Signals-only)
│                                 docs in angular/documentation/
├── ops/
│   ├── deploy.sh                 VPS-side deploy with rollback
│   └── nginx/                    edge reverse proxy (TLS termination)
├── .github/workflows/            CI and deploy
├── docker-compose.yaml           base stack (db, api, frontend)
├── docker-compose.dev.yaml       overlay: publish ports on loopback
├── docker-compose.production.yaml  overlay: TLS edge, certbot, monitoring
├── docker-compose.deployment.yaml  overlay: run prebuilt images from a registry
└── .env.example
```

## Run with Docker

Requirements: Docker Engine with the Compose plugin.

```bash
cp .env.example .env
```

Edit `.env` and replace `POSTGRES_PASSWORD` with a long random value — Compose
refuses to start without it. Then:

```bash
make dev
```

That is `docker compose -f docker-compose.yaml -f docker-compose.dev.yaml up
--build`. The base file publishes **no** host ports; the dev overlay adds them,
on loopback only. Production instead adds an Nginx edge on 80/443 — see
[GITHUB_DEPLOYMENT.md](GITHUB_DEPLOYMENT.md).

| URL                               | What                                            |
| --------------------------------- | ----------------------------------------------- |
| <http://localhost:8090>           | the app — **React**                             |
| <http://localhost:8092>           | the same app — **Angular**                      |
| <http://localhost:8090/api/items> | the API, same origin (either port works)        |
| <http://localhost:8081/api/docs>  | Swagger UI when using the direct dev API port   |
| `127.0.0.1:8081`                  | the API directly, for `pnpm dev` outside Docker |
| `127.0.0.1:5433`                  | PostgreSQL, for psql/pgAdmin                    |

`make dev` starts **both** frontends against the same API and database, so you
can open them in two tabs and compare. The tab titles differ — `Idol-Promo` and
`Idol-Promo (Angular)` — so it is obvious which is which.

Use `make dev-react` for the React app alone.

### If you prefer plain `docker compose`

The base file publishes **no host ports** and the Angular service is behind a
profile, so a bare `docker compose up -d` starts React only and exposes nothing.
Either name the files and profile explicitly:

```bash
docker compose --profile angular \
  -f docker-compose.yaml -f docker-compose.dev.yaml up --build -d
```

…or set these two in your local `.env` (see `.env.example`) and the bare command
does the same thing:

```dotenv
COMPOSE_FILE=docker-compose.yaml:docker-compose.dev.yaml
COMPOSE_PROFILES=angular
```

Useful commands:

```bash
make logs
make down
docker compose exec db psql -U items_user -d items_app -c "SELECT * FROM items;"
```

### The two frontends

`frontend/` holds two apps implementing the same product. `make dev` runs both;
they share the `api` service and proxy `/api/` identically, so the comparison is
like for like.

The Angular service sits behind the `angular` Compose profile. That keeps plain
`docker compose up` — and production — pointed at one unambiguous `frontend`,
because the edge proxy has no way to choose between two. `make dev` passes
`--profile angular` for you. To run it on its own:

```bash
docker compose --profile angular up -d --build frontend-angular   # 127.0.0.1:8092
```

**React is what production serves.** The Angular app is built, health-checked
and covered by CI (`validate-angular`), but nothing routes production traffic to
it yet.

`docker compose down` keeps the database volume. To deliberately delete all local
database data, use `docker compose down --volumes`.

The SQL in `db/init` bootstraps and seeds a new empty volume. The API then
applies ordered migrations embedded from `api/internal/migrations/sql`, so an
existing volume is upgraded before readiness becomes healthy.

## Signing in

Both frontends authenticate against the Go API. Seeded local accounts:

| Email                   | Password       | Role                                                         |
| ----------------------- | -------------- | ------------------------------------------------------------ |
| `admin@gmail.com` | `Password123!` | admin — every capability                                     |
| `user@gmail.com`  | `Password123!` | user — can read diagnostics, cannot write data or clear logs |

> Those credentials are committed in `db/init/002_auth.sql`, so treat both
> accounts as compromised anywhere real and delete them before exposing an
> environment.

**Forgot password** works end to end without a mail server: in development the
API returns the reset link in the response body and the UI displays it. That
branch is gated on `APP_ENV != production` — returning it in production would
hand anyone a password reset for any address.

### How the session is held

|               | Where                         | Lifetime                                           |
| ------------- | ----------------------------- | -------------------------------------------------- |
| Access token  | JavaScript memory             | 15 minutes                                         |
| Refresh token | httpOnly, SameSite=Lax cookie | browser session, or **30 days** with "Remember me" |

The access token is deliberately _not_ in `localStorage`: anything script can
read, injected script can steal. The refresh token is never visible to script at
all. A reload therefore starts with no access token and silently exchanges the
cookie for a new one.

### Configuration

| Variable              | Default                                | Notes                                                     |
| --------------------- | -------------------------------------- | --------------------------------------------------------- |
| `AUTH_JWT_SECRET`     | dev-only built-in                      | **Required** when `APP_ENV=production`; must be ≥32 bytes |
| `AUTH_ACCESS_TTL`     | `15m`                                  | How long a revoked user keeps access                      |
| `AUTH_REMEMBER_TTL`   | `720h`                                 | The "remember me for a month" lifetime                    |
| `AUTH_SECURE_COOKIES` | true outside development               | Must be true over HTTPS                                   |
| `AUTH_RESET_URL`      | `http://localhost:8090/reset-password` | Where reset links point                                   |

## API behavior

`GET /api/items` returns a JSON array:

```json
[{ "id": 1, "name": "Production dashboard" }]
```

Errors have a consistent shape:

```json
{
  "error": {
    "code": "DATABASE_ERROR",
    "message": "Unable to retrieve items",
    "requestId": "..."
  }
}
```

Pool settings are controlled by `DB_MAX_OPEN_CONNS`, `DB_MAX_IDLE_CONNS`, and
`DB_CONN_MAX_LIFETIME` in `docker-compose.yaml`. The included values are
conservative for the 3 GB VPS.

Operational probes are `/livez`, `/readyz`, and `/startupz`; `/health` remains
the legacy readiness alias. Product responses include an `ETag`; mutation
clients can send it in `If-Match` to prevent lost updates, and create retries
can send an `Idempotency-Key`.

## Develop without Docker

Run PostgreSQL first and export the variables used in `api/internal/config`.

```bash
cd api
DB_PASSWORD=your-local-password go run ./cmd/server
```

In another terminal:

```bash
cd frontend/react
pnpm install
pnpm dev
```

Or the Angular app, which serves the same product on `:4200`:

```bash
cd frontend/angular
pnpm install
pnpm start
```

> The Angular 22 CLI requires **Node ≥ 24.15**. `frontend/angular/.node-version`
> pins 26.5.0; the React app has no such floor, so a machine running an older
> Node can still build React while failing on Angular.

Vite proxies `/api` to `http://127.0.0.1:8081` — the port the dev overlay
publishes the API container on, so `pnpm dev` and the dockerized build hit the
same backend on the same relative path.

Tests and checks:

```bash
make check          # lint + test, both sides — this is what CI runs
make lint           # report only
make fmt            # apply every fix the tools can make on their own
```

Or per side:

```bash
cd api && go test ./...
make test-frontend                      # both apps
make lint-frontend                      # both apps

cd frontend/react && pnpm test          # Vitest
cd frontend/react && pnpm test:watch    # while working
cd frontend/react && pnpm lint          # ESLint, fails on errors only
cd frontend/react && pnpm lint:strict   # also fails on the burn-down warnings
cd frontend/react && pnpm format        # Prettier, rewrite
cd frontend/react && pnpm build

cd frontend/angular && pnpm test        # Vitest, writes .test-output/test-report.json
cd frontend/angular && pnpm lint        # ESLint over .ts and .html
cd frontend/angular && pnpm start       # dev server
cd frontend/angular && pnpm dev         # dev server + on-demand unit-test runner
cd frontend/angular && pnpm build
```

The linting setup is described in
[GITHUB_DEPLOYMENT.md](GITHUB_DEPLOYMENT.md#local-quality-gates); the rules
themselves live in [frontend/react/eslint.config.js](frontend/react/eslint.config.js) and
[api/.golangci.yml](api/.golangci.yml), each with the reasoning inline.

The backend architecture, API contracts, usage examples, best-practice
rationale, limitations, and extension checklist are documented in
[api/documentation/README.md](api/documentation/README.md).

## Deploy

Deployment is automated: a push to `main` runs the full check suite, then ships
to the VPS over SSH and rebuilds there, with automatic rollback if the new
stack does not become healthy.

The complete walkthrough — which steps happen on GitHub, which on the VPS, and
which on your machine — is in **[GITHUB_DEPLOYMENT.md](GITHUB_DEPLOYMENT.md)**.

Supplied host details:

| Setting             | Value                         |
| ------------------- | ----------------------------- |
| Host label          | `vps-ru6x`                    |
| OS                  | Ubuntu 24.04                  |
| CPU / memory / disk | 2 vCPU / 3 GB RAM / 30 GB SSD |
| Public IPv4         | `152.228.227.51`              |
| Private IPv4        | `10.10.10.78`                 |
| IPv6                | `2001:41d0:303:f333::1a3`     |
| SSH user            | `root`                        |
| SSH port            | `20076`                       |

The hosting-panel password is intentionally **not** stored in this repository.
Enter it only at the SSH prompt, and switch to key-only authentication once key
access is confirmed.

Firewall: allow inbound TCP `20076` (SSH), `80` and `443` (HTTP/HTTPS) in both
the provider firewall and `ufw`. Nothing else needs to be open — the database
and API are never published to the host in production.

```bash
ufw allow 20076/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

Still worth adding: automated PostgreSQL backups, unattended security upgrades,
and the external monitoring listed at the end of
[GITHUB_DEPLOYMENT.md](GITHUB_DEPLOYMENT.md).

## First-time Git setup

```bash
git config --global user.name "tvw-programming"
git config --global credential.helper osxkeychain

git remote add origin https://github.com/tvw-programming/idol-promo.git
git push -u origin main
git checkout -b dev
git push -u origin dev
```
