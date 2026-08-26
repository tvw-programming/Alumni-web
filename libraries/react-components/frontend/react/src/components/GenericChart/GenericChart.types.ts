import type { ComponentType, ReactNode } from 'react';

export type GenericChartSeriesType = 'line' | 'bar' | 'column' | 'area' | 'pie' | 'donut';

export interface GenericChartPoint<TMetadata = unknown> {
  id?: string;
  name?: string;
  x?: string | number | Date;
  y: number;
  color?: string;
  metadata?: TMetadata;
}

export interface GenericChartSeries<TMetadata = unknown> {
  id: string;
  name: string;
  type: GenericChartSeriesType;
  data: readonly GenericChartPoint<TMetadata>[];
  color?: string;
  yAxis?: number;
  stack?: string;
}

export interface GenericChartPointEvent<TMetadata = unknown> {
  series: Pick<GenericChartSeries<TMetadata>, 'id' | 'name' | 'type'>;
  point: GenericChartPoint<TMetadata>;
  pointIndex: number;
  seriesIndex: number;
}

export interface GenericChartAxisConfig {
  title?: string;
  categories?: readonly string[];
  type?: 'category' | 'linear' | 'datetime';
  labelFormatter?: (value: string | number) => string;
  min?: number;
  max?: number;
}

export interface GenericChartLegendConfig {
  visible?: boolean;
  toggleable?: boolean;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export interface GenericChartTooltipContext<
  TMetadata = unknown,
> extends GenericChartPointEvent<TMetadata> {
  formattedX: string;
  formattedY: string;
}

export interface GenericChartTooltipConfig<TMetadata = unknown> {
  enabled?: boolean;
  valuePrefix?: string;
  valueSuffix?: string;
  dateTimeFormat?: Intl.DateTimeFormatOptions;
  formatter?: (context: GenericChartTooltipContext<TMetadata>) => string;
}

export interface GenericChartThreshold {
  value: number;
  label?: string;
  color?: string;
  dashStyle?: 'Solid' | 'ShortDash' | 'Dash' | 'Dot';
  width?: number;
}

export interface GenericChartComparisonConfig {
  mode: 'difference' | 'percent';
  baseline?: 'first' | 'previous';
}

export interface GenericChartExportConfig {
  enabled?: boolean;
  filename?: string;
  formats?: readonly ('png' | 'svg' | 'csv')[];
}

export interface GenericChartAdapterProps<TMetadata = unknown> {
  series: readonly GenericChartSeries<TMetadata>[];
  title?: string;
  subtitle?: string;
  height: number;
  multiColor: boolean;
  interactive: boolean;
  legendVisible: boolean;
  legendPosition: NonNullable<GenericChartLegendConfig['position']>;
  xAxis?: GenericChartAxisConfig;
  yAxis?: GenericChartAxisConfig;
  tooltip?: GenericChartTooltipConfig<TMetadata>;
  thresholds?: readonly GenericChartThreshold[];
  comparison?: GenericChartComparisonConfig;
  exportOptions?: GenericChartExportConfig;
  onPointClick?: (event: GenericChartPointEvent<TMetadata>) => void;
  ariaLabel: string;
}

export interface GenericChartStateConfig {
  loading?: boolean;
  error?: ReactNode;
  emptyMessage?: ReactNode;
  loadingLabel?: string;
}

export interface GenericChartProps<TMetadata = unknown> {
  series: readonly GenericChartSeries<TMetadata>[];
  title?: string;
  subtitle?: string;
  height?: number;
  multiColor?: boolean;
  interactive?: boolean;
  legend?: GenericChartLegendConfig;
  xAxis?: GenericChartAxisConfig;
  yAxis?: GenericChartAxisConfig;
  tooltip?: GenericChartTooltipConfig<TMetadata>;
  thresholds?: readonly GenericChartThreshold[];
  comparison?: GenericChartComparisonConfig;
  exportOptions?: GenericChartExportConfig;
  state?: GenericChartStateConfig;
  onPointClick?: (event: GenericChartPointEvent<TMetadata>) => void;
  adapter?: ComponentType<GenericChartAdapterProps<TMetadata>>;
  ariaLabel?: string;
}
