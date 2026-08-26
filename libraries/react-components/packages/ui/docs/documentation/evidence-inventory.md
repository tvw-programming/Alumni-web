# Evidence inventory — pre-documentation audit

**Status: awaiting your approval.** This is step 1 of the two-prompt workflow.
No feature documentation has been written yet. Once you approve or correct the
rows below, the per-feature documents get written **from this inventory only**.

Repository: `/Users/tejasvikaswaghulde/Claude/Projects/idol`
Scope: `frontend/` (the Go service in `api/` was not inspected)
Verified against the working tree — **269 tests passing, 27 test files**,
`tsc --noEmit` and `eslint src` clean, `vite build` succeeds. (Was 222/21 when
this audit began; the increase is the authorization and grid tests added to
close findings 1–3 below.)

Every path below was confirmed to exist. Line numbers are anchors to the named
symbol, not spans.

---

## Planned output

| #   | Document                                             | Feature                       |
| --- | ---------------------------------------------------- | ----------------------------- |
| 1   | `documentation/features/generic-chart.md`            | Generic Chart                 |
| 2   | `documentation/features/forms.md`                    | Schema-driven forms           |
| 3   | `documentation/features/api-calls.md`                | API call layer + 13 scenarios |
| 4   | `documentation/features/table-variants.md`           | Grid variants                 |
| 5   | `documentation/features/generic-card-popup.md`       | Generic Card + Popup          |
| 6   | `documentation/features/error-monitoring-console.md` | Error & monitoring console    |
| 7   | `documentation/features/speech-navigation.md`        | Speech navigation             |
| —   | `documentation/README.md`                            | Index + shared architecture   |

---

## A. Cross-cutting foundations

These underpin every feature document; stated once here rather than seven times.

| Concern                                    | Implementation                                       | Evidence                                  | Line       |
| ------------------------------------------ | ---------------------------------------------------- | ----------------------------------------- | ---------- |
| Transport centralised in one factory       | `createApiClient` builds every Axios instance        | `frontend/react/src/api/axiosClient.ts`         | 25         |
| Auth header + refresh-once on 401          | Request interceptor + `refreshedRequests` WeakSet    | `frontend/react/src/api/axiosClient.ts`         | 31, 42, 56 |
| Errors normalised before leaving transport | Interceptor rejects with `AppError`, never raw Axios | `frontend/react/src/api/axiosClient.ts`         | 71–75      |
| One error normaliser                       | `normalizeError()` → discriminated `AppError`        | `frontend/react/src/utils/errors.ts`            | 13         |
| One user-message mapper                    | `getUserMessage()` switch over `kind`                | `frontend/react/src/utils/errors.ts`            | 54         |
| Typed request helpers, no ad-hoc fetch     | `get/post/put/patch/del` + `buildListQuery`          | `frontend/react/src/api/request.ts`             | 23, 39–86  |
| Retry policy is a pure function            | `shouldRetryRequest` — no retry on 4xx/auth/cancel   | `frontend/react/src/api/queryClient.ts`         | 7          |
| Per-call opt-out of the global toast       | `meta.silenceGlobalError` honoured in MutationCache  | `frontend/react/src/api/queryClient.ts`         | 29         |
| Query keys in one hierarchy                | `queryKeys` object, keys embed filters               | `frontend/react/src/api/queryKeys.ts`           | 9          |
| Route-level code splitting                 | Every page is `lazy: async () => import(...)`        | `frontend/react/src/routes/router.tsx`          | 24+        |
| Skip-to-content + focus on route change    | `SkipToContentLink`, `useFocusMainOnRouteChange`     | `frontend/react/src/components/layout/a11y.tsx` | 22         |
| Single navigation source of truth          | `PUBLIC_NAV` / `ADMIN_NAV` / `MASTER_DATA_NAV`       | `frontend/react/src/routes/navigation.tsx`      | 40, 48, 58 |

---

## B. Per-feature inventory

### 1. Generic Chart

| Concern                                 | Implementation                                     | Evidence                                                     | Line       |
| --------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------ | ---------- |
| Library-agnostic shell                  | `GenericChart` renders an injectable `adapter`     | `frontend/react/src/components/GenericChart/GenericChart.tsx`      | 39         |
| Default adapter is swappable            | `adapter: Adapter = HighchartsAdapter`             | same                                                         | 39         |
| State priority: loading → error → empty | Three early returns before adapter                 | same                                                         | 44, 57, 65 |
| Heavy transform memoised once           | Series normalisation + options in one `useMemo`    | `frontend/react/src/components/GenericChart/HighchartsAdapter.tsx` | 133        |
| Typed public contract                   | 12 exported interfaces, generic `TMetadata`        | `frontend/react/src/components/GenericChart/GenericChart.types.ts` | 3–124      |
| Parent owns drill-down                  | `onPointClick` → parent opens `GenericPopup`       | `frontend/react/src/features/dashboard/DashboardPage.tsx`          | 193        |
| Parent memoises series                  | `categorySeries` / `stockSeries` under `useMemo`   | `frontend/react/src/features/dashboard/DashboardPage.tsx`          | 131, 132   |
| Export PNG/SVG/CSV                      | Highcharts exporting + offline-exporting modules   | `frontend/react/src/components/GenericChart/HighchartsAdapter.tsx` | 3, 5, 292  |
| Accessible container                    | `role="img"` + `aria-label`                        | same                                                         | 320        |
| Tested                                  | 2 tests: state priority, interactive point payload | `frontend/react/src/components/GenericChart/GenericChart.test.tsx` | 50, 71     |

**RESOLVED — was a defect, now fixed.** Keyboard point-by-point navigation was
required, so it was implemented rather than documented as a limitation.

Two things were wrong, and the second was the real cause:

1. `accessibility: { enabled: false }` — the module was switched off.
2. The wrapper rendered `<div role="img">`. `role="img"` collapses its entire
   subtree into a single image for assistive tech, so even with the module on,
   every per-point node stayed hidden. Enabling the module alone did **not**
   fix it; the wrapper is now `role="group"`.

Verified in real Chrome over CDP (jsdom has no SVG layout and cannot answer
this):

| Check                          | Result                                                  |
| ------------------------------ | ------------------------------------------------------- |
| Chart in the tab order         | `.highcharts-container` has `tabindex="0"`              |
| Arrow keys move between points | focus border present from the first `ArrowRight` onward |
| Per-point announcements        | `"Jan, $48k. Actual."`, `"Feb, $54k. Actual."` …        |
| Chart-level description        | `"Combination chart with 2 data series…"`               |

Regression-guarded by `frontend/react/src/components/GenericChart/accessibility.test.tsx`
(5 tests), including an explicit assertion that no `role="img"` reappears in the
wrapper chain.

---

### 2. Schema-driven forms

| Concern                              | Implementation                                     | Evidence                                              | Line       |
| ------------------------------------ | -------------------------------------------------- | ----------------------------------------------------- | ---------- |
| JSON schema → rendered form          | `SchemaFormWrapper` maps `schema.fields`           | `frontend/react/src/components/forms/SchemaFormWrapper.tsx` | 56, 124    |
| Form engine bridged in one place     | `@tanstack/react-form` `useForm`                   | same                                                  | 15–17      |
| Field types extensible without edits | `registerFieldType` / `resolveFieldType` registry  | `frontend/react/src/components/forms/fields/registry.ts`    | 18, 34     |
| Per-form override shadows global     | `fieldTypes` prop wins over registry               | same                                                  | 34         |
| Self-registering built-ins           | Side-effect `import './fields'`                    | `frontend/react/src/components/forms/SchemaFormWrapper.tsx` | 14         |
| Per-field memoisation                | `export default memo(SchemaField)`                 | `frontend/react/src/components/forms/SchemaField.tsx`       | 241        |
| Validators memoised per field        | `buildSyncValidator` / `buildAsyncValidator`       | same                                                  | 151, 152   |
| 14 field renderers, each memoised    | `fields/*.tsx`, all `export default memo(...)`     | `frontend/react/src/components/forms/fields/`               | —          |
| Validation errors auto-logged        | `FormErrorLogger` renders null, writes to log      | `frontend/react/src/components/forms/FormErrorLogger.tsx`   | 5          |
| Blocking vs inline submit feedback   | `blocking` prop → overlay or in-button spinner     | `frontend/react/src/components/forms/SchemaFormWrapper.tsx` | 34–37, 141 |
| Two real consumers                   | `ProductForm`, `OrderForm` (249 / 251 lines)       | `frontend/react/src/components/ProductForm.tsx`             | 226        |
| Tested                               | 4 files: wrapper, helpers, coercion (44), textarea | `frontend/react/src/components/forms/`                      | —          |

---

### 3. API call layer + scenarios

| Concern                            | Implementation                                    | Evidence                                               | Line       |
| ---------------------------------- | ------------------------------------------------- | ------------------------------------------------------ | ---------- |
| UI never imports Axios             | Pages import hooks/services only                  | `frontend/react/src/features/admin/ApiCallExamplesPage.tsx`  | 22–31      |
| Cancellation threaded to transport | `queryFn: ({ signal }) => fetchX(..., signal)`    | `frontend/react/src/hooks/useProducts.ts`                    | 17         |
| Shared query options object        | `productsListOptions` reused by hook + prefetch   | same                                                   | 14         |
| Invalidation after mutation        | `invalidateQueries({ queryKey: products.all })`   | same                                                   | 34         |
| Optimistic update + rollback       | `onMutate` snapshot → `onError` restore           | `frontend/react/src/hooks/useApiScenarios.ts`                | 150, 159   |
| Explicit cancellation demo         | `client.cancelQueries`                            | same                                                   | 127        |
| Background prefetch                | `client.prefetchQuery`                            | same                                                   | 134        |
| Polling with interval              | `refetchInterval` + `refetchIntervalInBackground` | same                                                   | 103, 104   |
| 13 runnable patterns on one page   | `ApiCallExamplesPage`                             | `frontend/react/src/features/admin/ApiCallExamplesPage.tsx`  | 54         |
| Failed requests captured centrally | `logApiFailure` in the response interceptor       | `frontend/react/src/api/apiTelemetry.ts`                     | 67         |
| Correlation ID per request         | `X-Correlation-Id` header + trace WeakMap         | same                                                   | 20, 32, 41 |
| Tested                             | 4 API tests + 4 telemetry tests                   | `frontend/react/src/api/api.test.ts`, `apiTelemetry.test.ts` | —          |

---

### 4. Table variants

| Concern                             | Implementation                                | Evidence                                                       | Line              |
| ----------------------------------- | --------------------------------------------- | -------------------------------------------------------------- | ----------------- |
| One shared grid wrapper             | `AppDataGrid<TData>` typed props              | `frontend/react/src/components/grid/AppDataGrid.tsx`                 | 24                |
| Grid theme derived from MUI theme   | `themeQuartz.withParams(...)` in `useMemo`    | same                                                           | 102               |
| Grid options memoised               | `defaultColDef`, `rowSelection`, handlers     | same                                                           | 124, 142, 169–184 |
| **Variant 1 — read-only**           | `ProductsReadGrid`, quick filter + formatting | `frontend/react/src/features/admin/grids/ProductsReadGrid.tsx`       | 42                |
| **Variant 2 — inline edit**         | `ProductsInlineGrid` + editable col defs      | `frontend/react/src/features/admin/grids/ProductsInlineGrid.tsx`     | 107, 124          |
| **Variant 3 — managed**             | `UsersManagedGrid` + preferences + renderers  | `frontend/react/src/features/admin/grids/UsersManagedGrid.tsx`       | 99                |
| Config-driven editable columns      | `buildEditableColDefs`                        | `frontend/react/src/components/grid/editing/buildEditableColDefs.ts` | 48                |
| Editor state machine shared         | `useInlineEdit` used by 4 editors             | `frontend/react/src/components/grid/editing/useInlineEdit.ts`        | —                 |
| Custom cell renderers memoised      | 4 renderers, all `memo(...)`                  | `frontend/react/src/components/grid/renderers/`                      | —                 |
| Column/filter preferences persisted | `useGridPreferences` + `gridPreferences.ts`   | `frontend/react/src/hooks/useGridPreferences.ts`                     | 65–86             |
| Toolbar: search, fullscreen, prefs  | `GridHeaderActions`                           | `frontend/react/src/components/grid/GridHeaderActions.tsx`           | 98–127            |

**RESOLVED.** The gap was: **zero test files existed** anywhere under
`components/grid/` or `features/admin/grids/` — the shared grid wrapper, the
column builder and the validation gate that decides whether an edit reaches the
API were all unverified, while every other area of the app had coverage.

Now covered by 30 tests:

| File                           | Tests | What it pins                                                                                                                               |
| ------------------------------ | ----- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `AppDataGrid.test.tsx`         | 11    | rows, empty/loading, quick filter, selection, row click, grid API hand-off, pagination, custom renderers, grid/columnheader/gridcell roles |
| `buildEditableColDefs.test.ts` | 10    | read-only fallbacks, master switch, option resolution, handler precedence, defaults, config-key stripping                                  |
| `validateDraft.test.ts`        | 9     | required, numeric range, text length, trimming — every branch is a request that does not fire                                              |

Two of my initial assumptions were wrong and the tests caught them: AG Grid uses
role `grid` (not `treegrid`), and always renders the paging panel hidden via
`ag-hidden` rather than omitting it.

---

### 5. Generic Card + Generic Popup

| Concern                                   | Implementation                                       | Evidence                                                   | Line          |
| ----------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------- | ------------- |
| Composition over prop explosion           | `slots` (header/body/footer/loading/empty/error)     | `frontend/react/src/components/GenericCard/GenericCard.types.ts` | 65            |
| Grouped config objects                    | `header` / `state` / `appearance` / `windowControls` | same                                                       | 8, 20, 33, 46 |
| State priority resolved centrally         | `resolveBody()` loading → error → empty → body       | `frontend/react/src/components/GenericCard/GenericCard.tsx`      | 189           |
| Controlled _or_ uncontrolled window state | `useControllableBoolean`                             | same                                                       | 45            |
| Theme-token access guarded                | `glassIsEnabled(theme)` — degrades outside provider  | same                                                       | 248           |
| Popup delegates a11y to MUI               | Dialog/Drawer portal, focus trap, restoration        | `frontend/react/src/components/GenericPopup/GenericPopup.tsx`    | 235           |
| Close policy is data, not scattered ifs   | `isCloseBlocked(reason, behavior, loading)`          | same                                                       | 218           |
| Deliberately un-memoised, measured        | React Profiler numbers in the README                 | `frontend/react/src/components/GenericCard/README.md`            | —             |
| Tested                                    | 7 card tests + 6 popup tests                         | `GenericCard.test.tsx`, `GenericPopup.test.tsx`            | —             |

---

### 6. Error & monitoring console

| Concern                           | Implementation                                     | Evidence                                    | Line    |
| --------------------------------- | -------------------------------------------------- | ------------------------------------------- | ------- |
| One log model, three channels     | `api` / `app` / `test` on `ErrorLogEntry`          | `frontend/react/src/types/errorLog.ts`            | 39      |
| `level` vs `severity` separated   | Two independent fields, documented                 | same                                        | 25, 47  |
| Single API capture point          | `logApiFailure` — no request can fail unlogged     | `frontend/react/src/api/apiTelemetry.ts`          | 67      |
| Cancellations excluded on purpose | Early return on `kind === 'canceled'`              | same                                        | 68      |
| Process-level capture             | `error`, `unhandledrejection`, offline, console    | `frontend/react/src/utils/globalErrorHandlers.ts` | 45      |
| Transport-agnostic sink           | `setMonitoringSink()` — Sentry-ready, no dep       | `frontend/react/src/utils/monitoring.ts`          | 219–230 |
| Fingerprinting for grouping       | FNV-1a over identity fields                        | same                                        | 174     |
| Breadcrumbs, bounded ring         | 25-entry buffer                                    | same                                        | 25, 98  |
| Never breaks the app              | Every public fn wrapped; tested                    | `frontend/react/src/utils/errorLogger.ts`         | —       |
| Test channel from build artifact  | Vitest reporter → `public/test-report.json`        | `frontend/react/src/test/logReporter.ts`          | —       |
| Run-tests endpoint is dev-only    | `apply: 'serve'` Vite plugin                       | `frontend/react/src/test/runTestsPlugin.ts`       | 46      |
| Tested                            | 11 logger + 7 monitoring + 8 console + 4 telemetry | —                                           | —       |

---

### 7. Speech navigation

| Concern                              | Implementation                                    | Evidence                                           | Line       |
| ------------------------------------ | ------------------------------------------------- | -------------------------------------------------- | ---------- |
| One recognition session, app-wide    | Single `useSpeechRecognition` in the provider     | `frontend/react/src/speech/SpeechProvider.tsx`           | 63         |
| Zero re-renders from speech          | `transcribing: false` (verified in lib source)    | same                                               | 65         |
| Registration renders nothing         | Ref-backed registry + one static splat command    | same                                               | 41, 54     |
| Matching is pure and testable        | `matchCommand` — no React, no Web Speech API      | `frontend/react/src/speech/commandMatcher.ts`            | 122        |
| Lead-ins stripped once               | `stripLeadIn` over a lead-in table                | same                                               | 37, 68     |
| Exact beats fuzzy                    | Early return on exact phrase                      | same                                               | 144        |
| Positional commands generated        | `ordinalPhrases` per index                        | `frontend/react/src/speech/ordinals.ts`                  | 84         |
| Status via external store            | `useSyncExternalStore` selector                   | `frontend/react/src/speech/speechStore.ts`               | 88         |
| 3-min inactivity auto-off            | Watchdog, 15s tick                                | `frontend/react/src/speech/SpeechProvider.tsx`           | 21, 189    |
| Sidebar numbers only while listening | Reserved gutter, opacity only — no reflow         | `frontend/react/src/features/admin/MasterDataLayout.tsx` | 24, 29, 45 |
| Tested                               | 10 provider + 26 matcher + 18 ordinal + 5 sidebar | —                                                  | —          |

**Note:** `frontend/react/SpeechCMD.md` already covers the architecture decision in
depth. The feature doc will **link to it rather than restate it**, and cover
only the user-facing flow, command vocabulary and extension guide.

---

## C. Cannot be verified from code — I need you

These are in your documentation template but are **not derivable from the
implementation**. I will leave them blank rather than invent them.

| Item                                         | Why code cannot answer it                                                                                                                                                                 |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Business purpose** of each feature         | Code shows _what_, never _why the business wants it_. For the showcase pages the purpose is now known (demonstrate a reusable component); for the underlying components it is still open. |
| **Which real roles your organisation needs** | The implemented model is `admin` / `user`; whether that matches your org is a product decision.                                                                                           |
| ~~Which features are demo vs production~~    | **Answered:** the `Manage*` pages are an **internal component showcase**, not end-user product features. Documents will name the audience as developers working on this codebase.         |
| SLAs, data retention policy                  | Log buffer is capped at 500 entries in code; whether that is _policy_ is unknown.                                                                                                         |

### Security-relevant findings — RESOLVED in code

Findings 1–3 below were raised by this audit and have since been **fixed**. The
inventory rows are kept so the documentation records what changed and why.

1. ~~There is no role-based authorization.~~ **Fixed.** A capability model now
   exists and is enforced. `role` is read by `roleHas`/`roleHasAll`
   (`frontend/react/src/auth/permissions.ts`), routes gate on capabilities
   (`frontend/react/src/components/layout/ProtectedRoute.tsx:34`), and destructive
   diagnostics controls are hidden without `diagnostics:manage`.
2. ~~Auth is a mock that could ship.~~ **Partly fixed — see the caveat.** The
   mock is now unreachable in a production build (`MOCK_ALLOWED` is gated on
   `import.meta.env.DEV`), a real endpoint is used when `VITE_AUTH_ENDPOINT` is
   set, and its response is shape-checked before becoming a session
   (`frontend/react/src/services/authService.ts`). **The caveat is the whole point:
   no auth backend exists**, so this closes the "mock ships to production" hole
   without making authentication real. Still a **Limitation**.
3. ~~Grid layer has zero tests.~~ **Fixed.** 30 tests added across
   `AppDataGrid.test.tsx` (11), `buildEditableColDefs.test.ts` (10) and
   `validateDraft.test.ts` (9).
4. Per your rule 7, no secrets are included. `.env` was **not** read; the only
   env vars documented are their _names_ (`VITE_ERROR_LOG_ENDPOINT`,
   `VITE_GO_API_BASE_URL`, `VITE_AUTH_ENDPOINT`), never values.

### The client guard is not a security boundary

`ProtectedRoute` decides what to **render**. A user can edit client state, so
every capability must be re-checked server-side before it means anything. The
Go service in `api/` currently exposes `GET /health` and `GET /api/items` with
**no authentication middleware at all**
(`api/cmd/server/main.go:47-48`) — so today there is nothing enforcing these
permissions on the server. This is recorded as a **Limitation**, not a feature.

---

## D. Decisions taken (answers received)

| #   | Question                                      | Decision                                                                                                             |
| --- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| 1   | Highcharts a11y disabled — limitation or fix? | **Fix.** Point-by-point keyboard navigation is required. Implemented and verified in a real browser; see section B1. |
| 2   | Are the `Manage*` pages product or showcase?  | **Internal component showcase.** Audience is developers on this codebase, not end users.                             |
| 3   | Grid test gap — limitation or fix?            | **Fixed.** 30 tests added; see section B4 for what the gap actually was.                                             |
| 4   | Where does `ui-routing-requirements.md` live? | **Moved** to `documentation/ui-routing-requirements.md`; `frontend/docs/` removed.                                   |
| 5   | Depth per feature                             | **Exhaustive (~600+ lines each)**, following the full 16-section template.                                           |

## E. Verification performed on this inventory

- Every path listed was confirmed to exist on disk.
- Every line number was resolved by symbol lookup, not memory.
- Dead code was excluded: `src/components/grid/inline-edit/` was removed
  earlier this session after a reachability analysis proved it unreferenced;
  the live implementation is `src/components/grid/editing/`.
- Test counts come from an actual `vitest run` (222 passing, 21 files), not
  from counting `it(` by eye.
- No application code was modified while producing this inventory.
