# WeightLogChart

## API

```ts
type WeightLogChartProps = {
  entries: WeightEntry[];
  unit: 'kg' | 'lb';
  goalWeight?: number;
  emptyMessage?: string;
};
```

## The numbers carry the meaning, not the slope

The y-axis fits the data rather than starting at zero: a weight chart zeroed at
0 kg flattens every real change into a straight line, and one that is not zeroed
exaggerates. So the summary quotes real numbers — _"77.0 kg today. 1.4 kg down
since 2026-08-12."_ — and the plot is `aria-hidden` decoration with a table
toggle beside it.

## Plain wording

Weight is emotive data. The summary states the change with **no encouragement,
no judgement, and no inference about health**.

## React 19

`useActionState` for logging an entry. Not optimistic: a weight that appears and
then vanishes on a failed sync is worse than a half-second wait.
