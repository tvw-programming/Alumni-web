# DashboardChartCard

A chart with a mandatory text summary and a table view.

## API

```ts
type DashboardChartCardProps = {
  title: string;
  points: ChartPoint[];
  summary: string; // REQUIRED
  valueFormatter?: (value: number) => string;
  ranges?: { id; label }[];
  activeRange?: string;
  updatedAt?: string;
  loading?: boolean;
  emptyMessage?: string;
  onRangeChange?: (id: string) => void;
};
```

## `summary` is required

_"Revenue increased from ₹4.2M to ₹4.8M over the last 30 days."_ A chart is a
picture, and a picture with no text is nothing at all to a screen reader. Making
the prop **required** means a chart cannot ship without one — an optional prop
would be omitted, every time.

Write it server-side, next to the series, so the sentence and the numbers cannot
disagree.

## The table toggle

The second half of the same idea, and useful to everyone: reading an exact
figure off a line is guesswork. The SVG is `aria-hidden`; the summary and the
table are the accessible versions.

## React 19

Suspense for the initial fetch; `useActionState` for saving a range or layout as
a preference. **Never optimistic metric values** — a predicted number on a
dashboard is a wrong number presented with confidence.

## States

loading (skeleton, summary reads "Loading…") · empty ("No data for this period",
in both the summary and the plot area) · content.
