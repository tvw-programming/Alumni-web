# The port: React → Angular

What this document is for: if you know the React app, this tells you where
everything went, what changed shape, and — most usefully — the four places the
port could **not** be one-to-one.

## The mapping

| React | Angular |
| --- | --- |
| `useState` | `signal()` |
| `useMemo` | `computed()` |
| `useEffect` | `effect()` |
| `useCallback` | not needed — class methods are already stable |
| `useRef` (value) | a plain class field |
| `useRef` (DOM) | `viewChild()` |
| Context + provider | `@Injectable({ providedIn: 'root' })` holding signals |
| `useSyncExternalStore` | a signal in a service |
| `useQuery` | `httpResource(() => ({ url, params }))` |
| `useMutation` | an async service method plus signals |
| props | `input()` / `input.required()` |
| callback props | `output()` |
| controlled + `onChange` | `model()` |
| `React.memo` | nothing — see [architecture.md](architecture.md#change-detection) |
| render-prop / `ReactNode` prop | `<ng-content select="[slot]">` |
| a custom hook | a factory returning signals, or an abstract `@Directive` base |

### Libraries

| React | Angular | Note |
| --- | --- | --- |
| `@mui/material` + emotion | `@angular/material` + CDK | `sx` → SCSS + `--mat-sys-*` tokens |
| `ag-grid-react` 33 | `ag-grid-angular` **36** | theming API differs; re-derived, not copied |
| `highcharts-react-official` | `highcharts-angular` 5.4 | |
| `@tanstack/react-query` | `httpResource` / `resource` + a small cache | **the biggest gap — see below** |
| `@tanstack/react-form` | Reactive Forms + signals | |
| `react-router-dom` | `@angular/router` | |
| `axios` | `HttpClient` + `HttpInterceptorFn` | |
| `react-error-boundary` | `ErrorHandler` + route error components | |
| `framer-motion` | dropped | CSS transitions; nothing needed a JS animation library |
| `react-speech-recognition` | **none** — hand-written service | no Angular equivalent exists |
| `zod` | `zod` | unchanged |

## Ported verbatim

**1,547 lines were framework-free and moved unchanged**, and their tests came
with them. Those tests passing without modification is the strongest evidence
the port is faithful rather than merely compiling:

| File | Tests |
| --- | --- |
| `errors.ts` → `normalize-error.ts` (Axios branches → `HttpErrorResponse`) | 13 |
| `errorLogger.ts` → `error-logger.ts` | 11 |
| `monitoring.ts` → `monitoring.ts` | 7 |
| `formHelpers.ts` → `form-helpers.ts` | ✓ |
| `valueCoercion.ts` → `value-coercion.ts` | ✓ |
| `validateDraft.ts` → `validate-draft.ts` | ✓ |
| `buildEditableColDefs.ts` → `build-editable-col-defs.ts` | 19 |
| `commandMatcher.ts` + `ordinals.ts` | 44 |
| `permissions.ts`, `safeStorage.ts`, `format.ts`, `guards.ts`, `queryKeys.ts` | ✓ |

## The four places the port is not one-to-one

### 1. There is no `useMutation`, and that turned out to be fine

Angular has no "run this once and tell me how it went" primitive — `resource` is
for state that *derives* from a request, not for a command. So a mutation is an
async service method plus two signals.

For the scenario pages this became [`Run`](../src/app/features/admin/api-examples.service.ts),
about a dozen lines holding status/value/error. A card needs far less than a
mutation provides. The one behaviour worth keeping explicit: a **failed second
run keeps the previous value**, so a card showing a good result is not blanked
by a later failure. That is pinned by tests, because it is what makes the
polling card in scenario 13 stop flickering.

### 2. `httpResource` does not cancel in-flight requests

**This one is a genuine trap, and it was measured.**

Clearing the signal an `httpResource` depends on moves the *resource* back to
idle — but the HTTP request it already started **runs to completion**. Observed
over CDP: request sent at 28.2 s, finished at 33.0 s, 3.9 s after the user
clicked Cancel. The UI stops listening; the network does not stop.

`resource()` hands its loader a real `AbortSignal`. Passing it to `fetch` gives
`net::ERR_ABORTED, canceled: true` 0.9 s after the click.

> **Rule.** `httpResource` is the right default. When cancellation has to reach
> the wire, use `resource()` with its `abortSignal`. See
> [`api-scenarios.service.ts`](../src/app/features/admin/api-scenarios.service.ts).

### 3. There is no cache-key hierarchy

TanStack gives `queryKeys`, `invalidateQueries`, `staleTime` and
`keepPreviousData`. `httpResource` gives none of them.

[`QueryCache`](../src/app/core/http/query-cache.ts) fills the gap by caching
**invalidation signals, not responses**. A request function reads
`cache.version(key)`; bumping that version changes the request identity and
Angular refetches. Prefix invalidation works because segments are joined with a
space delimiter — so `['product']` cannot invalidate `['products']`.

Still missing, and **not** worked around: `staleTime`, background refetching,
and window-focus refetching. If those matter, they are real work, not a config
flag.

### 4. A hook has two Angular shapes, not one

- **`useErrorLog` → a factory returning signals** ([`channelView`](../src/app/features/admin/error-log/channel-view.ts)).
  Composes the same way a hook does; must be called in an injection context.
- **`useInlineEdit` → an abstract `@Directive` base** ([`inline-edit-base.ts`](../src/app/shared/grid/editing/inline-edit-base.ts)).
  Chosen because AG Grid instantiates editors as components, so the state
  machine has to *be* the component.

The base class turned out better in one respect: a `viewChild()` declared on an
`@Directive` base resolves against each subclass's template, so one declaration
gives all four editors autofocus. React needed a `useAutoFocus` call per editor.

## Things that were deleted rather than ported

Each of these existed in React to work around a rendering model Angular does not
have. Porting them would have been cargo cult.

| Deleted | Why it existed | Why it is unnecessary |
| --- | --- | --- |
| The snackbar **event bus** | so non-component code could raise a toast | DI: anything with an injector injects the service |
| `useSyncExternalStore` + a hand-written speech store | so only the mic button re-rendered on speech | a signal notifies exactly the views that read it |
| `transcribing: false`, a module-scope static command array, a ref-backed registry | to stop the whole app re-rendering on every phrase | same — nothing renders from the registry, so it is a plain `Map` |
| `React.memo` on `GenericCard`/`GenericPopup`, stable callback identities | to stop parent renders cascading | there is no cascade |
| `framer-motion` `ScrollReveal` | scroll animations | CSS, and not worth a dependency |
| Unsplash hero images | decoration | first paint should not depend on a third-party host |

## Things React does that Angular does not

Stated so nobody assumes parity that is not there.

| React has | Angular status |
| --- | --- |
| `staleTime` / background refetch / refetch-on-focus | **Not implemented.** |
| Grid column-preference persistence (`gridPreferences.ts`, per-user column order, width modes, sort tiers, filter presets) | **Not ported.** The React users grid has a preferences container; the Angular one does not. |
| Three MUI surface styles (plain / glass / 3D gradient glass) and custom primary/secondary colours | **Not ported.** Material 3 derives colour from `mat.theme()` at build time; a runtime colour picker would mean re-deriving a tonal palette in the browser. Light/dark is ported and applies app-wide. |
| `useQueries` for parallel work | `Promise.all` — the orchestration was never the library's doing |

## Angular-only gains

| | |
| --- | --- |
| Template type-checking | Templates are type-checked against the component. Several errors during this port were caught at build time that JSX would have surfaced at runtime. |
| `@angular-eslint` template rules | Accessibility and correctness rules run over `.html`, which has no React equivalent. |
| `prefer-signals` as a lint rule | The signals-only rule is machine-enforced, not a convention in a document. |
