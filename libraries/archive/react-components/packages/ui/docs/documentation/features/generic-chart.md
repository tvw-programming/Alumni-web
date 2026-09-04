# Generic Chart

> Evidence-based. Claims are labelled **Implemented** / **Inferred** /
> **Recommended** / **Limitation** / **Needs product input**. Unlabelled claims
> are Implemented. See [../README.md](../README.md).

---

## 1. Overview

`GenericChart` is a **library-agnostic charting shell**. It owns the states a
chart can be in (loading, error, empty, populated), the legend toggle, and the
accessibility contract. It does **not** own Highcharts: rendering is delegated to
a swappable `adapter` component, and the default adapter is the only file in the
codebase that imports Highcharts.

The separation is the point. Feature code depends on
`GenericChartSeries` — a plain typed shape — never on `Highcharts.Options`. If
the charting library is ever replaced, one adapter file changes and no feature
page does.

### Business purpose

**Needs product input.** The code shows what the component does, not why the
business wants charts. What _is_ known:

- The **dashboard** (`/admin/dashboard`) is a genuine end-user surface: live
  product data, drill-down into a popup.
- **`/admin/master-data/generic-chart`** is an **internal component showcase**
  (decided; see [../evidence-inventory.md](../evidence-inventory.md)), aimed at
  developers evaluating the component, not at end users.

### Intended users

| Surface                            | Audience                                |
| ---------------------------------- | --------------------------------------- |
| `/admin/dashboard`                 | Authenticated users with `admin:access` |
| `/admin/master-data/generic-chart` | Developers on this codebase             |

---

## 2. Entry points

### Routes

| Path                               | Component                | Guard                                     | Evidence                         |
| ---------------------------------- | ------------------------ | ----------------------------------------- | -------------------------------- |
| `/admin/dashboard`                 | `DashboardPage`          | `ProtectedRoute` (default `admin:access`) | `frontend/react/src/routes/router.tsx` |
| `/admin/master-data/generic-chart` | `ManageGenericChartPage` | inherits the admin shell guard            | `frontend/react/src/routes/router.tsx` |

Both are lazy route modules, so Highcharts (~) is not in the initial bundle:

```tsx
lazy: async () => ({
  Component: (await import('@/features/dashboard/DashboardPage')).DashboardPage,
}),
```

### Sidebar

"Generic Chart" appears in the Master Data sidebar, defined once in
`frontend/react/src/routes/navigation.tsx` and consumed by both the sidebar renderer
and the speech command layer — so the link and its voice command cannot drift
apart.

### Public exports

`frontend/react/src/components/GenericChart/index.ts` exports two components and 14
types:

```ts
export { GenericChart } from './GenericChart';
export { HighchartsAdapter } from './HighchartsAdapter';
export type {
  GenericChartAdapterProps,
  GenericChartAxisConfig,
  GenericChartComparisonConfig,
  GenericChartExportConfig,
  GenericChartLegendConfig,
  GenericChartPoint,
  GenericChartPointEvent,
  GenericChartProps,
  GenericChartSeries,
  GenericChartSeriesType,
  GenericChartStateConfig,
  GenericChartThreshold,
  GenericChartTooltipConfig,
  GenericChartTooltipContext,
} from './GenericChart.types';
```

`HighchartsAdapter` is exported deliberately: a caller that wants the default
rendering but a different wrapper can compose it directly.

---

## 3. User flows

### Primary — read a chart

1. User opens `/admin/dashboard`.
2. `useProducts` fetches live data; while pending, `state.loading` renders a
   skeleton of the chart's own height, so the layout does not jump.
3. Data arrives. The parent derives series with `useMemo`.
4. `GenericChart` renders the adapter; Highcharts draws.

### Primary — drill into a point

1. User clicks a column (or focuses it and presses Enter).
2. The adapter calls `onPointClick` with a typed `GenericChartPointEvent`.
3. The **parent** stores the event and opens a `GenericPopup`.
4. The popup renders the point's `metadata` — typed via the chart's `TMetadata`
   generic, so no casting is needed at the consumption site.

The chart never opens the popup itself. Orchestration belongs to the parent; see
[§12](#12-best-practice-justification).

### Alternate — keyboard drill-down

1. User tabs to the chart (`tabindex="0"` on the container).
2. Arrow keys move point to point; a focus border tracks the current point and
   the screen reader announces e.g. `"Jan, $48k. Actual."`.
3. Enter activates the point, firing the same `onPointClick`.

### Alternate — legend toggle

When `legend.toggleable` is set, the shell renders its own visibility button in
the top-left and holds `legendVisible` in local state, passing it to the adapter.
This is the one piece of view state the shell owns, because it affects nothing
outside the chart.

### Alternate — export

With `exportOptions.enabled`, the Highcharts context menu offers PNG / SVG / CSV.
Exports run **offline** — `highcharts/modules/offline-exporting` is imported, so
no chart data is sent to an external export server.

### Failure — request failed

The parent passes `state={{ error: message }}`; the shell renders an `Alert` and
never mounts the adapter.

### Failure — no data

`hasChartData()` returns false when every series is empty; the shell renders an
icon plus `state.emptyMessage`. Distinguishing "empty" from "error" matters —
"no sales this month" is not a fault.

---

## 4. Architecture

```
DashboardPage / ManageGenericChartPage        ← parent: data, memo, drill-down
        │  series, config, onPointClick
        ▼
GenericChart                                   ← shell: states, legend, a11y label
        │  GenericChartAdapterProps
        ▼
HighchartsAdapter (default, swappable)         ← the ONLY Highcharts importer
        │  Highcharts.Options
        ▼
highcharts-react-official → Highcharts
```

### Responsibility boundaries

| Concern                 | Owner               | Not owner     |
| ----------------------- | ------------------- | ------------- |
| Fetching data           | Parent (hooks)      | Chart         |
| Deriving series         | Parent (`useMemo`)  | Chart         |
| Loading / error / empty | `GenericChart`      | Adapter       |
| Legend visibility state | `GenericChart`      | Parent        |
| Highcharts options      | `HighchartsAdapter` | Everyone else |
| What a click means      | Parent              | Chart         |
| Popup / navigation      | Parent              | Chart         |

### Files

| File                     | Lines | Role                                                    |
| ------------------------ | ----- | ------------------------------------------------------- |
| `GenericChart.tsx`       | 115   | Shell: state priority, legend toggle, adapter injection |
| `GenericChart.types.ts`  | 124   | The entire public contract                              |
| `HighchartsAdapter.tsx`  | ~350  | Translates the app API into Highcharts options          |
| `index.ts`               | 18    | Public surface                                          |
| `GenericChart.test.tsx`  | 98    | State priority + interactive payload                    |
| `accessibility.test.tsx` | ~80   | Keyboard/AT contract                                    |
| `README.md`              | 28    | Short component note                                    |

---

## 5. Component hierarchy

```
<GenericCard>                        ← usually, but not required
  └── <GenericChart>
        ├── Skeleton              (state.loading)
        ├── Alert                 (state.error)
        ├── empty state           (no data in any series)
        └── <Box position="relative">
              ├── IconButton      (legend toggle, when legend.toggleable)
              └── <Adapter>       (default: HighchartsAdapter)
                    └── <div role="group" aria-label={ariaLabel}>
                          └── <HighchartsReact>
```

`GenericChart` and `GenericCard` are independent. The pages compose them, but a
chart renders fine on its own.

---

## 6. Data and event flow

### Data in

```
useProducts(filters)            hooks/useProducts.ts
   → queryFn ({ signal })       cancellation threaded to transport
   → fetchProducts(...)         services/productService.ts
   → get<Product[]>()           api/request.ts
   → apiClient                  api/axiosClient.ts
   → Product[]                  typed response
        ↓  parent useMemo
GenericChartSeries[]            plain, library-agnostic
        ↓
GenericChart → Adapter → Highcharts.Options
```

The transformation from domain data to chart series happens in the **parent**,
not the chart. `categorySeries(products)` and `stockSeries(products)` are plain
functions in `DashboardPage.tsx`, memoised on `[products]`:

```tsx
// Aggregation and sorting scale with API results and produce arrays passed to
// the memoized chart adapter, making these appropriate useMemo targets.
const categories = useMemo(() => categorySeries(products), [products]);
const stock = useMemo(() => stockSeries(products), [products]);
```

### Events out

```
User clicks / presses Enter on a point
   → Highcharts point.events.click
   → pointEvent(series, point, seriesIndex, pointIndex)   builds the typed event
   → onPointClick(event)                                   parent's callback
   → parent setState → <GenericPopup open>
```

The event is fully typed and carries the caller's own metadata:

```ts
export interface GenericChartPointEvent<TMetadata = unknown> {
  series: Pick<GenericChartSeries<TMetadata>, 'id' | 'name' | 'type'>;
  point: GenericChartPoint<TMetadata>;
  pointIndex: number;
  seriesIndex: number;
}
```

Point handlers are only attached when **both** `interactive` and `onPointClick`
are supplied — a non-interactive chart carries no click closures at all.

### Caching, invalidation, cancellation

Owned entirely by the data layer, not the chart. See
[api-calls.md](api-calls.md). Relevant defaults: `staleTime: 30_000`,
`placeholderData: keepPreviousData` (so a filter change re-renders with the
previous chart rather than a skeleton), and `signal` threaded into every
`queryFn`.

---

## 7. Public component API

### `GenericChartProps<TMetadata>`

| Prop              | Type                                                 | Default                                  | Notes                                                           |
| ----------------- | ---------------------------------------------------- | ---------------------------------------- | --------------------------------------------------------------- |
| `series`          | `readonly GenericChartSeries<TMetadata>[]`           | —                                        | **Required.** Memoise it.                                       |
| `title`           | `string`                                             | —                                        | Rendered by the adapter, also used for the default `ariaLabel`. |
| `subtitle`        | `string`                                             | —                                        |                                                                 |
| `height`          | `number`                                             | `320`                                    | Also the skeleton height, so loading does not shift layout.     |
| `multiColor`      | `boolean`                                            | `true`                                   | Per-series colours; pie/donut colour per point.                 |
| `interactive`     | `boolean`                                            | `false`                                  | Gates cursor, hover and click wiring.                           |
| `legend`          | `GenericChartLegendConfig`                           | `{}`                                     | `visible`, `toggleable`, `position`.                            |
| `xAxis` / `yAxis` | `GenericChartAxisConfig`                             | —                                        | `title`, `categories`, `type`, `labelFormatter`, `min`, `max`.  |
| `tooltip`         | `GenericChartTooltipConfig<TMetadata>`               | —                                        | Prefix/suffix, date format, or a full `formatter`.              |
| `thresholds`      | `readonly GenericChartThreshold[]`                   | —                                        | Horizontal plot lines with labels.                              |
| `comparison`      | `GenericChartComparisonConfig`                       | —                                        | Re-bases values before rendering.                               |
| `exportOptions`   | `GenericChartExportConfig`                           | —                                        | `enabled`, `filename`, `formats`.                               |
| `state`           | `GenericChartStateConfig`                            | `{}`                                     | `loading`, `error`, `emptyMessage`, `loadingLabel`.             |
| `onPointClick`    | `(e: GenericChartPointEvent<TMetadata>) => void`     | —                                        | Stabilise with `useCallback`.                                   |
| `adapter`         | `ComponentType<GenericChartAdapterProps<TMetadata>>` | `HighchartsAdapter`                      | Injection point for another library.                            |
| `ariaLabel`       | `string`                                             | `` `${title} chart` `` or `'Data chart'` | Group label for AT.                                             |

### Series and point shapes

```ts
export interface GenericChartSeries<TMetadata = unknown> {
  id: string;
  name: string;
  type: 'line' | 'bar' | 'column' | 'area' | 'pie' | 'donut';
  data: readonly GenericChartPoint<TMetadata>[];
  color?: string;
  yAxis?: number; // index, for dual-axis charts
  stack?: string; // stack group name
}

export interface GenericChartPoint<TMetadata = unknown> {
  id?: string;
  name?: string;
  x?: string | number | Date;
  y: number; // the only required field
  color?: string;
  metadata?: TMetadata; // travels untouched to onPointClick
}
```

`metadata` is the escape hatch that keeps the contract closed: callers attach
their own domain object to a point and get it back, typed, on click — without the
chart ever knowing what a "product" is.

### The adapter contract

`GenericChartAdapterProps` is what any replacement adapter must accept. Note it
is **resolved**, not optional: the shell has already applied defaults, so an
adapter never re-implements them.

| Shell prop                     | Adapter prop                               | Difference                                     |
| ------------------------------ | ------------------------------------------ | ---------------------------------------------- |
| `legend?: {...}`               | `legendVisible: boolean`, `legendPosition` | Resolved and split                             |
| `height?: number`              | `height: number`                           | Default applied                                |
| `multiColor?` / `interactive?` | required booleans                          | Defaults applied                               |
| `ariaLabel?`                   | `ariaLabel: string`                        | Fallback applied                               |
| `state`                        | _absent_                                   | Shell handles states before the adapter mounts |

---

## 8. Usage examples

### Minimal

```tsx
<GenericChart
  series={[{ id: 'rev', name: 'Revenue', type: 'column', data: [{ x: 'Jan', y: 42 }] }]}
/>
```

### Dashboard-style, interactive with drill-down

```tsx
const handlePointClick = useCallback((event: GenericChartPointEvent<DashboardChartMetadata>) => {
  setSelected(event);
  setPopup('point');
}, []);

<GenericChart
  series={REVENUE_SERIES}
  xAxis={{ categories: MONTHS }}
  yAxis={{ title: 'USD (k)' }}
  tooltip={{ valuePrefix: '$', valueSuffix: 'k' }}
  legend={{ toggleable: true }}
  interactive
  onPointClick={handlePointClick}
  exportOptions={{ enabled: true, filename: 'monthly-revenue' }}
/>;
```

### Threshold line and custom tooltip

```tsx
<GenericChart
  series={TREND_SERIES}
  thresholds={[{ value: 70, label: 'Stretch target' }]}
  tooltip={{
    formatter: ({ point, formattedY }) =>
      `<strong>${point.name ?? 'Region'}</strong><br/>Pipeline: ${formattedY}`,
  }}
  legend={{ visible: false }}
  interactive
  onPointClick={handlePointClick}
/>
```

### Wiring the query states through

```tsx
const productsQuery = useProducts(DASHBOARD_FILTERS);

<GenericChart
  series={categories}
  state={{
    loading: productsQuery.isLoading,
    error: productsQuery.error ? getUserMessage(normalizeError(productsQuery.error)) : undefined,
    emptyMessage: 'No products in this period',
  }}
/>;
```

### Swapping the adapter

```tsx
function EChartsAdapter<T>(props: GenericChartAdapterProps<T>) {
  /* … */
}

<GenericChart series={series} adapter={EChartsAdapter} />;
```

Nothing else in the app changes: `GenericChartSeries` is the contract, and no
feature file imports Highcharts.

---

## 9. Loading, empty and error behaviour

State priority is decided in the shell, in this order:

```tsx
if (state.loading)                       → Skeleton (height matches the chart)
if (state.error != null)                 → Alert severity="error"
if (!hasChartData(series))               → icon + emptyMessage
otherwise                                → <Adapter />
```

| State     | Renders                             | Accessibility                                                                   |
| --------- | ----------------------------------- | ------------------------------------------------------------------------------- |
| Loading   | Two skeletons at the chart's height | `aria-busy="true"`, `aria-label` from `state.loadingLabel` ?? `'Loading chart'` |
| Error     | MUI `Alert` with `ErrorOutlineIcon` | Alert role announces automatically                                              |
| Empty     | `BarChartIcon` + message            | Icon `aria-hidden`; the text carries the meaning                                |
| Populated | Adapter                             | See [§11](#11-accessibility)                                                    |

Two deliberate choices:

- **Loading beats error.** A refetch after a previous failure shows progress, not
  a stale error.
- **Empty is not error.** `hasChartData` checks `series.some(s => s.data.length > 0)`,
  so a series that exists but has no points is empty, not broken.

**Verified:** `GenericChart.test.tsx:50` asserts the full priority order.

---

## 10. Comparison, thresholds and formatting

### Comparison mode

`comparison` re-bases every point before rendering, in `displaySeries()`:

| `mode`         | `baseline: 'first'` (default) | `baseline: 'previous'` |
| -------------- | ----------------------------- | ---------------------- |
| `'difference'` | `y - data[0].y`               | `y - data[i-1].y`      |
| `'percent'`    | `(y - base) /                 | base                   | * 100` | same, previous point |

Division by zero is guarded: a zero baseline yields `0`, not `Infinity`.

**Limitation.** Comparison transforms the _rendered_ values only. `onPointClick`
receives the **original** point, because the parent almost always wants the real
value, not the delta. This is not stated in the type — see
[§14](#14-limitations-and-trade-offs).

### Thresholds

Each threshold becomes a Highcharts `plotLine` on the y-axis, with optional
`label`, `color`, `dashStyle` and `width`.

### Axis formatting

`labelFormatter` receives the raw axis value and returns a string, so currency
and unit formatting stay in the caller's control rather than being guessed by the
chart.

---

## 11. Accessibility

This section documents a **defect that was found and fixed** during this audit.

### What was wrong

1. `accessibility: { enabled: false }` — the Highcharts a11y module was off.
2. The adapter wrapped the chart in `<div role="img">`. **`role="img"` collapses
   its entire subtree into a single opaque image for assistive tech.** Enabling
   the module alone did _not_ fix keyboard navigation, because every per-point
   node stayed hidden behind that role.

A third, self-inflicted issue is worth recording: an over-specified
`keyboardNavigation.seriesNavigation` + custom `screenReaderSection` config
**silently disabled series navigation**. The module defaults are correct; only
the focus-border colour is now overridden.

### What is implemented now

```tsx
import 'highcharts/modules/accessibility';

accessibility: {
  enabled: true,
  keyboardNavigation: {
    enabled: true,
    focusBorder: { enabled: true, style: { lineWidth: 2, color: theme.palette.primary.main } },
  },
},
```

and the wrapper is a labelled group, not an image:

```tsx
<div role="group" aria-label={ariaLabel}>
  <HighchartsReact highcharts={Highcharts} options={options} />
</div>
```

### Verified behaviour

jsdom has no SVG layout, so it cannot answer "does ArrowRight move from Jan to
Feb". This was verified in **real Chrome over CDP**:

| Check                          | Result                                                                 |
| ------------------------------ | ---------------------------------------------------------------------- |
| Chart in the tab order         | `.highcharts-container` has `tabindex="0"`                             |
| Arrow keys move between points | focus border present from the first `ArrowRight` onward                |
| Per-point announcement         | `"Jan, $48k. Actual."`, `"Feb, $54k. Actual."`, `"Mar, $61k. Actual."` |
| Chart-level description        | `"Combination chart with 2 data series. View as data table…"`          |
| Axis description               | `"The chart has 1 X axis displaying categories…"`                      |

Point announcements inherit the caller's `tooltip.valuePrefix` / `valueSuffix`,
so sighted and non-sighted users hear the same units.

### Keyboard reference

| Key               | Action                                    |
| ----------------- | ----------------------------------------- |
| `Tab`             | Move into / out of the chart              |
| `←` `→`           | Previous / next point in the series       |
| `↑` `↓`           | Between series                            |
| `Enter` / `Space` | Activate the point (fires `onPointClick`) |
| `Esc`             | Leave the chart's navigation              |

### Regression guard

`accessibility.test.tsx` (5 tests) asserts the module is loaded, the container is
focusable, the screen-reader region exists, and — the specific regression —
**that no `role="img"` reappears** in the wrapper chain.

### Responsive behaviour

`Box position="relative" minWidth={0}` is what allows the chart to shrink inside
a CSS grid cell; without `minWidth: 0` a flex/grid child refuses to go below its
content width. Highcharts reflows on container resize. The dashboard grid is
`1fr` below `xl` and `repeat(2, minmax(0, 1fr))` above.

**Limitation.** There is no reduced-motion handling for chart animation.
`chart.animation` is derived from the MUI transition helper, not from
`prefers-reduced-motion`. **Recommended:** gate `chart.animation` on the media
query.

---

## 12. Best-practice justification

| Practice                               | Code evidence                                                                                                                 | Justification                                                                                                         | Trade-off                                                                                                  |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Adapter injection**                  | `adapter: Adapter = HighchartsAdapter` (`GenericChart.tsx:39`)                                                                | Highcharts is confined to one file; swapping libraries touches one adapter, not N pages.                              | An extra indirection and a second prop interface to keep in sync.                                          |
| **Typed generic contract**             | `GenericChartProps<TMetadata>`, 14 exported types                                                                             | `metadata` round-trips to `onPointClick` fully typed — no casts at the drill-down site.                               | Callers must thread `TMetadata` through parent state.                                                      |
| **Parent-owned orchestration**         | `handlePointClick` opens the popup in `DashboardPage.tsx:193`                                                                 | The chart stays reusable: one page opens a popup, another could navigate or filter.                                   | Every consumer wires its own drill-down; nothing is free.                                                  |
| **Composition over prop explosion**    | Chart nests inside `GenericCard` rather than growing card props                                                               | Two small components compose into many layouts.                                                                       | Two components to learn instead of one.                                                                    |
| **Focused memoisation**                | One `useMemo` for the entire option tree (`HighchartsAdapter.tsx:138`); `categorySeries`/`stockSeries` memoised in the parent | Option construction is the only genuinely expensive work; memoising it avoids rebuilding on unrelated parent renders. | 17-entry dependency array; an unstable `onPointClick` defeats it — hence `useCallback` at both call sites. |
| **State priority in the shell**        | Three early returns before the adapter                                                                                        | Every chart in the app behaves identically when loading or failing; the adapter never sees a half-state.              | The shell decides; a caller wanting a custom skeleton must wrap.                                           |
| **Separation of transform and render** | `displaySeries()` / `compareValue()` are pure module functions                                                                | Comparison logic is testable without a DOM.                                                                           | Two passes over the data when comparison is on.                                                            |
| **Accessibility by default**           | Module imported eagerly; `role="group"` wrapper                                                                               | No caller can ship an inaccessible chart by forgetting to opt in.                                                     | The a11y module is always in the bundle, even for a decorative chart.                                      |
| **Offline export**                     | `highcharts/modules/offline-exporting`                                                                                        | Chart data never leaves the browser for rendering.                                                                    | Larger bundle; no server-side high-res rendering.                                                          |
| **Lazy route loading**                 | `lazy: async () => import(...)` in `router.tsx`                                                                               | Highcharts stays out of the initial bundle.                                                                           | First navigation to a chart page pays a chunk fetch.                                                       |

---

## 13. Testing

### Current coverage

| File                     | Tests | Covers                                                                                                           |
| ------------------------ | ----- | ---------------------------------------------------------------------------------------------------------------- |
| `GenericChart.test.tsx`  | 2     | State priority (loading→error→empty); adapter receives resolved config; `onPointClick` payload                   |
| `accessibility.test.tsx` | 5     | Module loaded; container focusable; SR region present; caller label preserved; **`role="img"` regression guard** |

The state-priority test injects a **stub adapter** rather than rendering
Highcharts — it asserts the contract (`data-legend-visible`, the click payload)
without depending on SVG:

```tsx
expect(chart).toHaveAttribute('data-legend-visible', 'true');
// after toggling
expect(chart).toHaveAttribute('data-legend-visible', 'false');
expect(onPointClick).toHaveBeenCalledWith(/* typed event */);
```

### Browser verification

Keyboard navigation was verified in real Chrome over the DevTools Protocol,
because jsdom cannot render SVG. That check is **not** in the automated suite.

**Limitation.** There is no automated browser test. A regression in keyboard
navigation would be caught only by the indirect signals in
`accessibility.test.tsx` (module loaded, container focusable, no `role="img"`) —
which is exactly where the last bug lived, but not a full guarantee.

**Recommended:** a Playwright test that tabs into a chart, presses `ArrowRight`,
and asserts the focus border moves and the announcement changes.

### Commands

```bash
cd frontend/react
pnpm exec vitest run src/components/GenericChart   # 7 tests
pnpm test                                          # full suite
```

---

## 14. Limitations and trade-offs

| #   | Limitation                                                                                                                                                                      |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **No automated keyboard test.** Verified manually in Chrome; jsdom cannot render SVG. See §13.                                                                                  |
| 2   | **Comparison mode and click payload disagree.** `comparison` rewrites rendered `y`, but `onPointClick` returns the original point. Intentional, but not expressed in the types. |
| 3   | **No reduced-motion handling** for chart animation.                                                                                                                             |
| 4   | **Series types are a closed union.** Adding scatter/bubble means editing `GenericChartSeriesType` and the adapter — a custom adapter cannot introduce a type on its own.        |
| 5   | **`multiColor` means different things** for cartesian (colour per series) and circular (colour per point) charts. Convenient, but a caller has to know.                         |
| 6   | **Dual axes are index-based.** `series.yAxis` is a number with no compile-time link to an axis definition.                                                                      |
| 7   | **Highcharts is a commercial library.** Non-commercial use is free; a licence is required otherwise. Not a code issue, but a real constraint.                                   |
| 8   | **The a11y module is always bundled**, even for decorative charts. Accepted: opt-in accessibility is accessibility that does not happen.                                        |

---

## 15. Extension guide

### Add a new series type

1. Extend `GenericChartSeriesType` in `GenericChart.types.ts`.
2. Handle it in `chartType()` and in the circular branch of `HighchartsAdapter`.
3. Add a case to the option builder if it needs bespoke options.

### Write a different adapter

Implement `GenericChartAdapterProps<TMetadata>` — all props arrive resolved:

```tsx
export function EChartsAdapter<T>({
  series,
  height,
  legendVisible,
  legendPosition,
  interactive,
  onPointClick,
  ariaLabel,
}: GenericChartAdapterProps<T>) {
  const options = useMemo(() => toEChartsOptions(series /* … */), [series /* … */]);
  return (
    <div role="group" aria-label={ariaLabel}>
      <ReactECharts option={options} style={{ height }} />
    </div>
  );
}
```

Two obligations: **memoise the option tree**, and **do not use `role="img"`** on
the wrapper (see §11).

### Add a chart to a page

```tsx
const series = useMemo(() => toSeries(data), [data]);
const onPointClick = useCallback((e: GenericChartPointEvent<MyMeta>) => {
  /* … */
}, []);

<GenericCard header={{ title: 'My metric' }} appearance={{ size: 'expanded' }}>
  <GenericChart series={series} interactive onPointClick={onPointClick} />
</GenericCard>;
```

Both `useMemo` and `useCallback` are load-bearing: an unstable value invalidates
the adapter's option memo on every parent render.

### Add a new chart route

1. Add the page under `src/features/`.
2. Add a lazy route in `router.tsx`.
3. Add the entry to `MASTER_DATA_NAV` in `routes/navigation.tsx` — this makes it
   a sidebar link _and_ a voice command in one edit.

---

## 16. Evidence index

| Claim                            | File                                                          | Line     |
| -------------------------------- | ------------------------------------------------------------- | -------- |
| Adapter injection with a default | `frontend/react/src/components/GenericChart/GenericChart.tsx`       | 39       |
| Loading state first              | `frontend/react/src/components/GenericChart/GenericChart.tsx`       | 44       |
| Error state second               | `frontend/react/src/components/GenericChart/GenericChart.tsx`       | 58       |
| Empty state third                | `frontend/react/src/components/GenericChart/GenericChart.tsx`       | 66       |
| `hasChartData`                   | `frontend/react/src/components/GenericChart/GenericChart.tsx`       | 18       |
| Legend toggle state              | `frontend/react/src/components/GenericChart/GenericChart.tsx`       | 42       |
| Full public contract             | `frontend/react/src/components/GenericChart/GenericChart.types.ts`  | 1–124    |
| Adapter prop contract            | `frontend/react/src/components/GenericChart/GenericChart.types.ts`  | 80       |
| Single option memo               | `frontend/react/src/components/GenericChart/HighchartsAdapter.tsx`  | 138      |
| Comparison transform             | `frontend/react/src/components/GenericChart/HighchartsAdapter.tsx`  | 46       |
| Threshold plot lines             | `frontend/react/src/components/GenericChart/HighchartsAdapter.tsx`  | 253      |
| Accessibility options enabled    | `frontend/react/src/components/GenericChart/HighchartsAdapter.tsx`  | 209      |
| Accessibility module import      | `frontend/react/src/components/GenericChart/HighchartsAdapter.tsx`  | 7        |
| `role="group"` wrapper           | `frontend/react/src/components/GenericChart/HighchartsAdapter.tsx`  | 341      |
| Offline export modules           | `frontend/react/src/components/GenericChart/HighchartsAdapter.tsx`  | 10       |
| Parent memoises series           | `frontend/react/src/features/dashboard/DashboardPage.tsx`           | 131, 132 |
| Parent owns drill-down           | `frontend/react/src/features/dashboard/DashboardPage.tsx`           | 193      |
| Showcase usage                   | `frontend/react/src/features/admin/ManageGenericChartPage.tsx`      | 120, 141 |
| Public exports                   | `frontend/react/src/components/GenericChart/index.ts`               | 1–18     |
| State-priority test              | `frontend/react/src/components/GenericChart/GenericChart.test.tsx`  | 50       |
| Interactive payload test         | `frontend/react/src/components/GenericChart/GenericChart.test.tsx`  | 71       |
| Accessibility tests              | `frontend/react/src/components/GenericChart/accessibility.test.tsx` | 1–80     |
