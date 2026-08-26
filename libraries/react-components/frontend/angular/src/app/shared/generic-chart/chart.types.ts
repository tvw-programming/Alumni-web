/**
 * Public chart contract, ported from the React app's `GenericChart.types.ts`.
 *
 * Deliberately library-agnostic: feature code depends on these shapes, never on
 * `Highcharts.Options`. The React version's `adapter` prop (a `ComponentType`)
 * is dropped — Angular swaps an implementation by projecting a different
 * component, so the injection point is the template, not a prop.
 */

export type ChartSeriesType = 'line' | 'bar' | 'column' | 'area' | 'pie' | 'donut';

export interface ChartPoint<TMetadata = unknown> {
  id?: string;
  name?: string;
  x?: string | number | Date;
  /** The only required field. */
  y: number;
  color?: string;
  /** Travels untouched to `pointClick`, typed by the caller's generic. */
  metadata?: TMetadata;
}

export interface ChartSeries<TMetadata = unknown> {
  id: string;
  name: string;
  type: ChartSeriesType;
  data: readonly ChartPoint<TMetadata>[];
  color?: string;
}

export interface ChartPointEvent<TMetadata = unknown> {
  series: Pick<ChartSeries<TMetadata>, 'id' | 'name' | 'type'>;
  point: ChartPoint<TMetadata>;
  pointIndex: number;
  seriesIndex: number;
}

export interface ChartAxisConfig {
  title?: string;
  categories?: readonly string[];
  min?: number;
  max?: number;
}

export interface ChartThreshold {
  value: number;
  label?: string;
  color?: string;
}

export interface ChartTooltipConfig {
  valuePrefix?: string;
  valueSuffix?: string;
}
