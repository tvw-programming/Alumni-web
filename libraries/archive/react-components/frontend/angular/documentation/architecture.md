# Architecture

## The one rule

**No `BehaviorSubject`, no `async` pipe, no manual `subscribe()` in feature
code.** RxJS appears only where an Angular API returns it, and is converted at
that boundary with `toSignal()` or consumed once with `firstValueFrom`.

RxJS appears in exactly six places, and the distinction between them matters.

**Subscribed** — three files, four call sites, all in `shared/`, none in a
feature. Verify with
`grep -rn "\.subscribe(" src/app --include='*.ts' | grep -v spec`:

| Site | Why |
| --- | --- |
| [`generic-popup.ts`](../src/app/shared/generic-popup/generic-popup.ts) ×2 | `dialogRef.keydownEvents()` and `backdropClick()` — CDK-owned events with no signal equivalent, both wrapped in `takeUntilDestroyed()` |
| [`snackbar.service.ts`](../src/app/shared/snackbar/snackbar.service.ts) | `ref.onAction()` — the action-button click |

**Converted at the boundary** — never subscribed:

| Site | Why |
| --- | --- |
| [`master-data-layout.ts`](../src/app/layout/master-data-layout/master-data-layout.ts) | `BreakpointObserver.observe()` → `toSignal()` immediately |
| [`field-shell.ts`](../src/app/shared/forms/fields/field-shell.ts) | `control.events` → `toSignal()`, because Reactive Forms state is not signal-backed |

**Consumed once** — `firstValueFrom`, for one-shot Observables: every
`HttpClient` write, and `MatDialogRef.afterClosed()` in
[`generic-popup-page.ts`](../src/app/features/admin/generic-popup-page.ts).
That last one *was* a `.subscribe()` in feature code — a violation of this rule
that the documentation audit caught, and it was fixed rather than excused.

Everything else is signals.

**Why it matters, concretely.** A `FormControl`'s `touched`, `status` and
`errors` are plain properties, not signals. A `computed()` reading them
evaluates once and never again — which is exactly the bug that shipped: unit
tests passed while validation messages never appeared in the browser. The fix
was `control.events` → `toSignal()`, and the reason it works is that the signal
is what re-triggers the `computed`. See
[features/forms.md](features/forms.md#the-validation-bug-that-tests-did-not-catch).

## Zoneless

`provideZonelessChangeDetection()` is on. This is the correct pairing with a
signals-only app and it is Angular 22's default for new projects.

The practical consequence: change detection runs when a signal that a template
read actually changes. Nothing schedules a global check on every timer, promise
or event. This is what makes several React performance workarounds unnecessary
rather than merely unfashionable — see
[react-to-angular.md](react-to-angular.md#things-that-were-deleted-rather-than-ported).

## Layering

```
src/app/
├── core/          no UI. Services, HTTP, errors, auth, theme, speech.
│   ├── auth/      AuthStore, guards, the capability table
│   ├── config/    app-config.ts — replaces Vite's import.meta.env
│   ├── errors/    logger, monitoring, normalisation, the log store
│   ├── http/      interceptor, telemetry, query cache, query keys
│   ├── speech/    Web Speech service, matcher, ordinals, nav commands
│   ├── storage/   guarded localStorage/sessionStorage
│   └── utils/     format, guards
├── shared/        reusable UI with no feature knowledge
│   ├── forms/     the schema-driven engine and its field registry
│   ├── grid/      AG Grid wrapper + the inline-editing framework
│   ├── generic-card/  generic-popup/  generic-chart/
│   ├── api/  page-container/  accent-card/  snackbar/  speech/
├── layout/        the three shells + navigation.ts
└── features/      pages. May import shared and core; never each other.
```

**`layout/navigation.ts` is the single source of truth.** The sidebar renders
from it, `app.routes.ts` generates routes from it, and the speech layer builds
commands from it. A link, its route and its voice command therefore cannot
drift apart — the failure mode where a menu item navigates somewhere that no
longer exists is structurally impossible.

## Dependency injection over prop threading

React's providers became root services. The difference this makes is largest in
the snackbar: React needed a module-level event bus so plain TypeScript (a query
client's error handler) could raise a toast. Angular deleted the bus, because
anything with an injector can `inject(SnackbarService)`.
[`background-job.ts`](../src/app/features/admin/background-job.ts) exists to
demonstrate exactly that.

### What is root-provided, and what is not

| Scope | Examples | Reason |
| --- | --- | --- |
| `providedIn: 'root'` | `AuthStore`, `QueryCache`, `ThemeStore`, `SpeechService`, `ErrorLogStore`, `SnackbarService` | Genuinely application-wide state, one instance for the app's life |
| Component-provided | `ProductService`, `UserService`, `ApiScenariosService`, `ApiExamplesService` | Page state. Created with the page, destroyed with it. |

**The reason page services are not root-provided** is that a root `httpResource`
would outlive its page and hold a stale list forever. It is not that root
resources never fetch — an earlier draft of
[`product.service.ts`](../src/app/features/products/product.service.ts) said
that, and it was wrong.

## Change detection

Every component is `ChangeDetectionStrategy.OnPush`. With zoneless + signals
this is close to redundant, but it is cheap and it documents intent.

**`React.memo` has no equivalent and needs none.** A signal read in a template
subscribes precisely that view. There is no parent re-render cascading into
children, so there is nothing to memoise against. The React app's memoisation
audit — `GenericCard`, `GenericPopup`, stable callback identities, dependency
arrays — has no counterpart here because the problem does not arise.

## Bundle strategy

Initial bundle **~161 kB raw / ~41 kB transferred**, with every route a
`loadComponent`.

Two things were moved out of the initial chunk after measurement:

| Change | Effect |
| --- | --- |
| AG Grid registration moved from `main.ts` to [`ag-grid-setup.ts`](../src/app/shared/grid/ag-grid-setup.ts), imported only by grid components | 949 kB → 287 kB |
| `@angular/animations` removed entirely — deprecated in v22; Material 3 animates with CSS | — |

Highcharts and its modules are dynamic imports declared once in
[`app.config.ts`](../src/app/app.config.ts), so they load with the first chart
rendered rather than at startup. **They are declared at the root deliberately**:
they were previously per-component, and three charts on one page raced their
loaders — every chart failed with "Failed to load Highcharts modules". One root
loader cannot race itself.

## Configuration

Vite's `import.meta.env` has no Angular equivalent.
[`core/config/app-config.ts`](../src/app/core/config/app-config.ts) is the single
place that is resolved: `IS_DEV = isDevMode()`, `RELEASE`, `API_BASE_URL`,
`ERROR_LOG_ENDPOINT`, `AUTH_ENDPOINT`. Nothing else in the app reads
environment state.

## Security posture

Authentication is now **backed by a real API**: bcrypt-verified credentials, a
signed access token, and server-side session revocation
(`api/internal/handler/`, `api/internal/auth/`).

**Be precise about what that does and does not cover.** The API ships
`RequireAuth` and `RequireRole` middleware, and applies them to `/api/auth/me`.
`/api/items` is deliberately **public** — the Team page reads it without a
session. So today the server enforces *identity*, and the admin console's data
still comes from a third-party demo API rather than from a protected endpoint
of ours. Adding a protected resource means adding `RequireAuth` to its route;
the middleware is there and tested.

The guards here remain a *rendering* decision, which is the right division as
far as it goes: they decide what to show, the server decides what to serve.

Session handling:

- **Access token in memory, never in storage.** Anything script can read,
  injected script can steal. It lasts ~15 minutes.
- **Refresh token in an httpOnly, SameSite=Lax cookie**, so script cannot read
  it at all and an XSS bug cannot exfiltrate a 30-day session. `SameSite=Lax`
  blocks the cross-site POST that CSRF depends on.
- **Refresh tokens rotate on use**, and presenting a revoked one revokes every
  session for that user — a replayed token is strong evidence it leaked.
- Because the access token is in memory, a reload starts signed out.
  `AuthStore.isRestoring` exists so guards wait for the refresh rather than
  bouncing the user to `/login` on every refresh.

What *is* real on the client:

- The capability table in [`permissions.ts`](../src/app/core/auth/permissions.ts)
  is data, not scattered `role === 'admin'` checks, so adding a role is one
  edit. Call sites ask for a capability, never a role.
- `permissionGuard(['diagnostics:manage'])` gates clearing a log channel
  separately from reading it — clearing destroys evidence someone else may need.
- The dev mock is **gone**. There is a real API, so there is nothing to fall
  back to and nothing to forget to remove.
- The [`api.interceptor.ts`](../src/app/core/http/api.interceptor.ts) attaches
  internal headers **only to our own origin**. Sending `Authorization` to a
  third party leaks a credential, and a custom header on a cross-origin GET
  forces a preflight that a third-party server will not satisfy — which is how
  the demo API's requests were hanging before this was fixed.
- The dev-only test runner ([`tools/test-runner-server.mjs`](../tools/test-runner-server.mjs))
  executes a shell command, so it binds to loopback and is started only by
  `pnpm dev`. The UI's checks on top of that are conveniences, not the control.

## Testing

Vitest via `@angular/build:unit-test`, matching the React side.

[`src/test-setup.ts`](../src/test-setup.ts) installs an in-memory `Storage`.
This is not cosmetic: the test DOM exposes `localStorage` as a property that is
present but `undefined`, so every module that persists state silently fell into
its swallowed-exception path and its tests failed with empty reads. The React
app carries [an identical shim](../../react/src/test/memoryStorage.ts) for the
same reason — the failure was found there too, and had been failing on `main`.
