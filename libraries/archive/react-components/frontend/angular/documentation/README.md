# Angular documentation

Evidence-based documentation for the **Angular** implementation. Every
implementation claim points at a file, and most at a line.

## These are deliberately separate from the React documents

`frontend/react/documentation/` describes a different application. The two apps
implement the same product, but the data layer is not comparable — React's
documents describe TanStack Query's cache, query keys, `staleTime`,
`keepPreviousData` and `invalidateQueries`, none of which exist here. Merging
them would produce documents hedged with "in React…/in Angular…" on every
paragraph, and hedged documents are the ones nobody trusts.

Read [react-to-angular.md](react-to-angular.md) for the mapping between them,
including the four places the port could not be one-to-one.

## How to read these documents

| Label                   | Meaning                                                             |
| ----------------------- | ------------------------------------------------------------------- |
| **Implemented**         | Confirmed in the current code, with a file reference.               |
| **Inferred**            | A reading of intent that the code supports but does not state.      |
| **Recommended**         | Not implemented. A suggestion, clearly marked as such.              |
| **Limitation**          | A real constraint or trade-off, stated plainly rather than softened. |
| **Verified**            | Observed in a running browser, with the observation recorded.       |

If a claim carries no label, it is **Implemented**.

## Index

| Document                                                                     | Covers                                                             |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| [architecture.md](architecture.md)                                           | Signals-only rule, layering, DI, change detection, bundle strategy |
| [react-to-angular.md](react-to-angular.md)                                   | The port: what mapped, what did not, and what was deleted          |
| [features/data-layer.md](features/data-layer.md)                             | `httpResource`, `resource`, the query cache, cancellation          |
| [features/forms.md](features/forms.md)                                       | Schema-driven engine over Reactive Forms, field registry           |
| [features/grid.md](features/grid.md)                                         | AG Grid v36 wrapper, theming, config-driven inline editing         |
| [features/error-console.md](features/error-console.md)                       | Three-channel log, monitoring sink, admin console, test reporting  |
| [features/speech-navigation.md](features/speech-navigation.md)               | Web Speech service, command matching, ordinals, watchdog           |
| [features/components.md](features/components.md)                             | Card, popup, chart shells and their accessibility contracts        |

## Running it

```bash
cd frontend/angular
pnpm install
pnpm start      # dev server on :4200
pnpm dev        # dev server + the on-demand unit-test runner
pnpm test       # Vitest, and writes .test-output/test-report.json
pnpm lint       # ESLint over .ts and .html
pnpm build
```

**Node ≥ 24.15 is required** by the Angular 22 CLI. `.node-version` pins 26.5.0.

`pnpm start` alone does not serve the unit-test report — see
[features/error-console.md](features/error-console.md#running-tests-from-the-ui).

## Deployment

There is a `Dockerfile` and an `nginx.conf`, and a `frontend-angular` service in
`docker-compose.yaml` behind the **`angular` profile**:

```bash
docker compose --profile angular up -d --build frontend-angular   # 127.0.0.1:8092
```

Behind a profile because the edge proxy points at one unambiguous `frontend`,
and two services both claiming that role is a routing question this stack has no
answer for. **The React app is what is deployed today.** The Angular image is
built, run and health-checked, and CI (`validate-angular`) lints, typechecks,
tests and builds it on every PR — but nothing routes production traffic to it.

Three things differ from the React image, none cosmetic:

| | React | Angular | Why |
| --- | --- | --- | --- |
| Base image | `node:24-alpine` | `node:26-alpine` | the CLI declares `^22.22.3 \|\| ^24.15.0 \|\| >=26.0.0`, and `node:24-alpine` currently resolves to 24.14.x |
| pnpm install | `corepack prepare` | `npm i -g pnpm` | corepack was unbundled from the Node images at 25 |
| Output dir | `dist` | `dist/angular/browser` | the application builder's layout |

### Cache policy is not portable between them

Vite emits hashed artifacts under `/assets/`, so React caches one prefix
immutably. The Angular builder emits `main-*.js`, `chunk-*.js` and `styles-*.css`
at the **root**, beside files that are not hashed at all. The rule therefore
keys on filename shape. Getting it wrong either way is an outage: caching
`index.html` immutably points browsers at bundles that no longer exist, and
caching `/schemas/*.json` immutably freezes the Order Form schema that is
fetched at runtime precisely so it can change.

**Verified** against the running container: `index.html` and `/schemas/` are
`no-cache`, hashed bundles are `immutable`, a missing bundle 404s instead of
falling through to `index.html` with a 200, SPA deep links serve the app, and
the security headers are present.

The dev-only test-runner endpoint is **not** proxied by this config. The Unit
tests tab degrades to "no report available", which is the correct behaviour for
a deployed build.

## Current state

| | Value |
| --- | --- |
| Tests | 242 across 23 files |
| Initial bundle | ~161 kB raw, ~41 kB transferred |
| Lint | clean (`ng lint`, `.ts` + `.html`) |
| Routes | 20 nav destinations, every one a real page, plus a logging 404 |

## Audience

Same as the React set: the `Manage*` pages under `/admin/master-data` are an
**internal component showcase**, not end-user features. These documents are for
developers reusing, extending or interrogating this code.
