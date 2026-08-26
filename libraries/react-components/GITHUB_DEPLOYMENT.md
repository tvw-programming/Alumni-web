# GitHub and VPS deployment

This guide wires the repository to GitHub Actions so that every change is
validated and every push to `main` is deployed to the VPS.

The pipeline uses no marketplace deployment integrations. It is implemented in
[.github/workflows/ci-deploy.yml](.github/workflows/ci-deploy.yml) with
GitHub-hosted runners, OpenSSH, rsync, and Docker Compose, plus
[ops/deploy.sh](ops/deploy.sh) on the VPS.

## Where each step happens

| # | Step | Runs on |
| --- | --- | --- |
| 1 | Create the deploy user, install Docker, create `/opt/idol-promo` | **VPS** |
| 2 | Generate the deployment SSH key, install the public half, capture host keys | **Mac** (installs onto the **VPS**) |
| 3 | Write `/opt/idol-promo/.env` with the real PostgreSQL password | **VPS** |
| 4 | Add Actions secrets and the `APP_DOMAIN` variable | **GitHub** |
| 5 | Create the `production` environment | **GitHub** |
| 6 | Review the pinned action SHAs (pinning itself is already done) | **GitHub** |
| 7 | Push `main` and watch the first run | **Mac** → **GitHub** |
| 8 | Point DNS at the VPS, issue the TLS certificate, activate HTTPS | **DNS provider** + **VPS** |
| 9 | Certificate renewal cron, host metrics, uptime checks | **VPS** |

Nothing in steps 1, 3, 8 or 9 belongs on GitHub — the PostgreSQL password, the
`.env` file, the TLS private key and the database volume never leave the VPS.

## How the pipeline works

1. A pull request against `main` runs `go test`, `go vet`, `golangci-lint`,
   `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test` and
   `pnpm build`, then stops.
2. A push to `main` runs the same validation, then deploys.
3. Deployment rsyncs the working tree to `/opt/idol-promo` on the VPS,
   excluding `.git/`, `.env` and the `release*.env` files.
4. The VPS runs `ops/deploy.sh`, which tags the running images as `:rollback`,
   rebuilds the ARM64 images locally, and brings the stack up with `--wait`.
5. If the new stack fails to become healthy within 90 seconds, `ops/deploy.sh`
   restores the `:rollback` images and exits non-zero, failing the workflow.
6. `concurrency: production` with `cancel-in-progress: false` means deployments
   queue rather than overlap — an interrupted `docker compose up` would leave
   the stack half-replaced.

---

## 1. VPS — deploy user and application directory

```bash
ssh root@YOUR_VPS_IP -p YOUR_SSH_PORT
```

On the VPS:

```bash
adduser --disabled-password --gecos "" deploy
usermod -aG docker deploy
mkdir -p /opt/idol-promo
chown -R deploy:deploy /opt/idol-promo
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
```

The `deploy` user controls Docker, so treat its SSH key as a production secret.
Verify the group took effect:

```bash
id deploy   # output must include `docker`
```

## 2. Mac — deployment key and known hosts

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/idol_github_actions
```

Use an empty passphrase; GitHub Actions cannot answer a prompt.

Install the public half on the VPS:

```bash
cat ~/.ssh/idol_github_actions.pub | \
  ssh root@YOUR_VPS_IP -p YOUR_SSH_PORT \
  'cat >> /home/deploy/.ssh/authorized_keys &&
   chown deploy:deploy /home/deploy/.ssh/authorized_keys &&
   chmod 600 /home/deploy/.ssh/authorized_keys'
```

Test it, then capture the host keys for the `VPS_KNOWN_HOSTS` secret:

```bash
ssh -i ~/.ssh/idol_github_actions deploy@YOUR_VPS_IP -p YOUR_SSH_PORT
ssh-keyscan -p YOUR_SSH_PORT YOUR_VPS_IP
```

Run `ssh-keyscan` from a trusted network. Do not disable host-key verification.

## 3. VPS — application secrets

```bash
cd /opt/idol-promo
nano .env
```

```dotenv
POSTGRES_DB=items_app
POSTGRES_USER=items_user
POSTGRES_PASSWORD=REPLACE_WITH_A_LONG_RANDOM_PASSWORD
```

```bash
chmod 600 /opt/idol-promo/.env
chown deploy:deploy /opt/idol-promo/.env
```

This file is the only copy of the database password. The workflow excludes it
from rsync, so it survives every deployment — and `ops/deploy.sh` refuses to
run if it is missing.

## 4. GitHub — secrets and variables

**Settings → Secrets and variables → Actions**

Repository secrets:

| Secret | Value |
| --- | --- |
| `VPS_HOST` | VPS IP or hostname |
| `VPS_PORT` | SSH port |
| `VPS_USER` | `deploy` |
| `VPS_SSH_KEY` | Entire contents of `~/.ssh/idol_github_actions` |
| `VPS_KNOWN_HOSTS` | Full `ssh-keyscan` output from step 2 |

Repository variable (the **Variables** tab, not Secrets):

| Variable | Value |
| --- | --- |
| `APP_DOMAIN` | `promo.example.com` — only used for the deployment link |

Never put the PostgreSQL password, the VPS root password, or `.env` in GitHub.

## 5. GitHub — production environment

**Settings → Environments → New environment → `production`**

The workflow's `deploy` job targets this environment. Optionally add required
reviewers so deployments wait for manual approval, and restrict the environment
to the `main` branch.

## 6. GitHub — action pinning (already done)

Every action in `.github/workflows/ci-deploy.yml` is pinned to a full commit
SHA, with a trailing `# vN` comment recording the release. Tags are mutable: an
attacker who compromises an action repository can repoint `v6` at their own
code, and this workflow holds an SSH key with Docker access on the VPS.

The pinned SHAs are the tag tips as published by GitHub — they have not been
read line by line. If your threat model requires that, review each before the
first production deployment.

To bump one later, resolve the new tag and check the diff before committing:

```bash
gh api repos/actions/checkout/git/ref/tags/v6 --jq .object.sha
```

Annotated tags (`pnpm/action-setup`) resolve to a tag object rather than a
commit; dereference it with
`gh api repos/pnpm/action-setup/git/tags/<sha> --jq .object.sha`.

## 7. Mac → GitHub — push and watch

```bash
git push -u origin main
```

Open the repository's **Actions** tab and follow **CI and deploy**. Then:

```bash
curl http://YOUR_VPS_IP/api/items
```

## 8. DNS + VPS — HTTPS

Until a domain resolves to the VPS the edge proxy serves plain HTTP only;
Let's Encrypt cannot issue a certificate for a bare IP.

1. At the DNS provider, point an `A` (and `AAAA`) record at the VPS IP.
2. On the VPS, issue the certificate through the `certbot` profile:

   ```bash
   cd /opt/idol-promo
   docker compose -f docker-compose.yaml -f docker-compose.production.yaml \
     --profile certbot run --rm certbot certonly \
     --webroot --webroot-path=/var/www/certbot -d promo.example.com
   ```

3. Activate the HTTPS configuration:

   ```bash
   cp ops/nginx/tls.conf.example ops/nginx/default.conf
   sed -i 's/promo.example.com/YOUR_DOMAIN/g' ops/nginx/default.conf
   docker compose -f docker-compose.yaml -f docker-compose.production.yaml \
     up -d --force-recreate edge
   ```

   Commit the edited `ops/nginx/default.conf` so the next rsync does not
   overwrite it with the HTTP-only version.

## 9. VPS — renewal and monitoring

Renewal, twice daily via `crontab -e` as the `deploy` user:

```cron
17 3,15 * * * cd /opt/idol-promo && docker compose -f docker-compose.yaml -f docker-compose.production.yaml --profile certbot run --rm certbot && docker compose -f docker-compose.yaml -f docker-compose.production.yaml exec -T edge nginx -s reload
```

Already in place:

- **Docker log rotation** — the `x-logging` anchor in `docker-compose.yaml`
  caps every container at 10 MB × 5 files. Unbounded JSON logs are the usual
  way a small VPS runs out of disk.
- **Structured API logs** — Go `slog` already emits JSON to stdout; Docker
  captures it. Do not add a JavaScript logger for the Go backend.
- **Uptime Kuma** — `--profile monitoring` in the production overlay, published
  on loopback only. Reach it over an SSH tunnel:
  `ssh -L 3001:127.0.0.1:3001 deploy@YOUR_VPS_IP -p YOUR_SSH_PORT`.

Still to add, in rough priority order:

1. **External** uptime checks (a second Uptime Kuma, or a hosted checker) — the
   on-box instance cannot report that the box itself is down.
2. **Prometheus node_exporter** for CPU, RAM, disk and filesystem metrics.
3. **Sentry** for React browser exceptions, and optionally Go error reporting.
4. **Grafana Alloy → Grafana Cloud/Loki** for centralised container logs.

## Local quality gates

```bash
make check   # exactly what CI runs
make lint    # report only
make fmt     # apply every fix the tools can make on their own
```

### Frontend — ESLint + Prettier

Rules live in [frontend/react/eslint.config.js](frontend/react/eslint.config.js), each with
its reasoning inline. Flat config, ESLint 9, **type-aware**: the parser loads
the TypeScript project, which is what makes `no-floating-promises` and
`no-misused-promises` possible — the two rules that catch the most real bugs in
an async React Query codebase.

| Package | Catches |
| --- | --- |
| `typescript-eslint` (recommended + stylistic, type-checked) | unsound types, dropped promises, unsafe `any` flow |
| `eslint-plugin-react-hooks` | dependency arrays, refs read during render, `setState` in effects |
| `eslint-plugin-react-refresh` | module shapes that silently break Vite fast refresh |
| `eslint-plugin-jsx-a11y` | missing labels, roles, keyboard handlers |
| `eslint-plugin-import-x` | import cycles, duplicate and mis-ordered imports |
| `@tanstack/eslint-plugin-query` | unstable query keys, missing `queryFn` deps |
| `eslint-config-prettier` | turns off every rule that would fight the formatter |

Rules are in two tiers:

- **error** — blocks CI. `pnpm lint` currently reports **0**.
- **warn** — the review tier for findings that may need a typing or component
  refactor. Currently **0**. Intentional third-party typing boundaries,
  colocated Fast Refresh exports, and demo callbacks carry narrow inline
  explanations, so `pnpm lint:strict` now passes without weakening a rule
  globally.

Three rules have already made that trip and are now **errors**:

| Rule | What was fixed |
| --- | --- |
| `react-hooks/set-state-in-effect` | `SnackbarProvider` pumped a queue through an effect; the visible snackbar is now derived from the queue head |
| `react-hooks/refs` | `usePreferenceDraft`, `PagePreferencesPanel` and `GridHeaderActions` read or wrote refs during render |
| `@typescript-eslint/no-base-to-string` | seven `String(unknown)` sites now route through `toDisplayString` (`src/utils/format.ts`) |
| `jsx-a11y/no-autofocus` | grid cell editors focus themselves via `useAutoFocus` (`src/hooks/useAutoFocus.ts`); the login field keeps one reviewed inline exemption |

That is the intended shape of the ratchet — fix the findings, then close the
door behind you.

### The `any` family — cleared

The schema-driven form system typed its boundaries as `any`, and that flowed
outward into every renderer. It is now `unknown` end to end:

- **`FieldValue` / `FormValues`** (`src/types/formSystem.ts`) replace
  `any` and `Record<string, any>` across the schema types, the renderer
  contract (`fields/types.ts`) and both demo forms.
- **`valueCoercion.ts`** (`src/components/forms/fields/`) is where each
  renderer narrows once — `asInputValue`, `asChecked`, `asNumber`,
  `asStringArray`, `asChoice`, `asFileArray`, `cloneEmptyValue`.
- **`SchemaField`** types its form prop structurally (`store` + `Field` only),
  which sidesteps `ReactFormExtendedApi`'s twelve generics.

The four former `no-unsafe-assignment` findings are all where a third-party
type is itself `any`: AG Grid's `ColDef.cellRenderer` and
`CustomCellEditorProps.value`, and MUI's `SxProps`. Each boundary now has a
narrow inline explanation; casting there would add noise without safety.

The three `consistent-type-assertions` sites are computed-key object spreads
(`{ ...row, [field]: value } as TData`) that TypeScript cannot narrow back to
the row type. The assertions remain and are documented inline.

The ten demo-only `no-console` callbacks and twelve intentional
`react-refresh/only-export-components` colocations are also documented with
narrow inline exceptions. They remain informational by design, not debt.

## Husky

Installed for the nested `frontend/react/` package on `pnpm install`:

```bash
cd frontend/react && pnpm install
```

`frontend/react/.husky/pre-commit` runs `lint-staged` (ESLint `--fix` + Prettier on
staged files), then a project-wide `pnpm typecheck` and `pnpm test`. It is
deliberately thin — Git hooks are skippable with `--no-verify` and are not
installed until someone runs `pnpm install`, so CI remains authoritative.

## Troubleshooting

**Permission denied while connecting.** Confirm the public key is in
`/home/deploy/.ssh/authorized_keys` and that `VPS_SSH_KEY` holds the matching
private key, including the `-----BEGIN`/`-----END` lines.

**Docker permission denied.** `id deploy` must list `docker`. Adding the group
requires a fresh SSH session.

**Missing `.env`.** Create it once on the VPS (step 3). The workflow never
uploads it.

**Host key verification failed.** Regenerate `VPS_KNOWN_HOSTS` with
`ssh-keyscan` and update the secret.

**Deployment failed; restoring previous images.** `ops/deploy.sh` rolled back.
The last 50 log lines from `api` and `frontend` are in the workflow output; for
more, `docker compose -f docker-compose.yaml -f docker-compose.production.yaml logs`
on the VPS.

**Rollback images missing.** Expected on the very first deployment — there is
no previous `:latest` to fall back to. The stack is left in its failed state
for inspection.
