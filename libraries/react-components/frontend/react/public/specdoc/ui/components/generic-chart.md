## Component Specification

### Name & Purpose

`GenericChart` — a library-agnostic chart shell. Owns the states a chart can be
in and the accessibility contract; Highcharts is confined to an adapter.

### Location

`src/components/GenericChart/` — `GenericChart.tsx`, `HighchartsAdapter.tsx`,
`GenericChart.types.ts`, `accessibility.test.tsx`

### Public Interface

```ts
type ChartSeriesType = 'line' | 'bar' | 'column' | 'area' | 'pie' | 'donut';

interface ChartPoint<TMeta = unknown> {
  id?: string;
  name?: string;
  x?: string | number | Date;
  y: number; // the only required field
  color?: string;
  metadata?: TMeta;
}
interface ChartSeries<TMeta = unknown> {
  id: string;
  name: string;
  type: ChartSeriesType;
  data: readonly ChartPoint<TMeta>[];
  color?: string;
}
```

Feature code depends on these shapes, **never** on `Highcharts.Options`.

### Dependencies

- Internal: theme context.
- External: `highcharts`, `highcharts-react-official`.

### Data Models

None persisted.

### Business Rules & Constraints

**Accessibility — do not regress this.** The original implementation shipped with
a defect worth repeating so it is not reintroduced:

1. The accessibility module was **disabled**, so charts had no keyboard
   navigation at all.
2. The wrapper used `role="img"`, which collapses the subtree into a single
   opaque image. Enabling the module alone did **not** help, because every
   per-point node stayed hidden behind that role.

So: the module is loaded unconditionally, and the wrapper is a labelled
**`role="group"`, never `role="img"`**. Over-configuring
`keyboardNavigation.seriesNavigation` silently disabled point navigation, so only
the focus-border colour is overridden.

**Verified**: `role="group"`, `tabindex="0"`, a screen-reader region reading
"Combination chart with 2 data series…", and per-point announcements.

**Other rules:**

- Exporting is offline (`fallbackToExportServer: false`) — chart data never
  leaves the browser to be rendered.
- `area` series use `fillOpacity: 0.3`; opaque fills make the series drawn last
  hide everything under it.
- The options object is the one heavy transformation, so it gets the one memo.

### Extension Points

- **A new series type:** add to `ChartSeriesType` and map it in the adapter.
- **A different charting library:** implement the adapter against the same
  `ChartSeries` contract. No feature code changes.
- **Drill-down:** `interactive` + the point-click callback; the dashboard uses it.
