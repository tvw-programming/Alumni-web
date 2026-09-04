# KPIStatCard

A single metric.

## API

```ts
type KPIStatCardProps = {
  label: string;
  value: string; // already formatted; this component does no arithmetic
  comparison?: { deltaLabel; direction: 'up' | 'down' | 'flat'; upIsGood?: boolean; periodLabel };
  sparkline?: number[];
  updatedAt?: string;
  loading?: boolean;
  pinned?: boolean;
  onTogglePin?: (next: boolean) => Promise<void>;
  onPress?: () => void;
};
```

## `upIsGood`

Direction is not sentiment. Revenue up is green; **churn up is red**. A card that
colours every up-arrow the same way tells half its users the opposite of the
truth.

## React 19

`useOptimistic` for **pinning** — the user's own layout preference. The metric
value is never optimistic; metrics are authoritative.

## The sparkline is `aria-hidden`

The card's label already carries the number and the trend in words. A chart
announced as "graphic" adds nothing — the text summary _is_ the accessible
version.

## States

`loading` shows a skeleton only on first load. A background refetch leaves the
previous number on screen; blanking a dashboard tile every 30 seconds is worse
than a slightly stale number.
