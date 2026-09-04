import { useTheme } from '@mui/material/styles';
import Highcharts from 'highcharts';
// Gives every point a keyboard stop and a screen-reader description. Without
// it a chart is an opaque image: announced, but impossible to explore without
// a mouse. Loaded eagerly rather than behind a prop so no caller can ship an
// inaccessible chart by forgetting to opt in.
import 'highcharts/modules/accessibility';
import 'highcharts/modules/exporting';
import 'highcharts/modules/export-data';
import 'highcharts/modules/offline-exporting';
import HighchartsReact from 'highcharts-react-official';
import { useMemo } from 'react';

import type {
  GenericChartAdapterProps,
  GenericChartPoint,
  GenericChartPointEvent,
  GenericChartSeries,
  GenericChartSeriesType,
} from './GenericChart.types';

const DEFAULT_FORMATS = ['png', 'svg', 'csv'] as const;

function chartType(type: GenericChartSeriesType): 'line' | 'bar' | 'column' | 'area' {
  return type === 'line' || type === 'bar' || type === 'column' || type === 'area' ? type : 'line';
}

function internalColors(primary: string, secondary: string): readonly string[] {
  return [primary, secondary, '#2e7d32', '#ed6c02', '#9c27b0', '#0288d1', '#d32f2f'];
}

function compareValue(
  value: number,
  pointIndex: number,
  points: readonly GenericChartPoint[],
  mode: 'difference' | 'percent',
  baseline: 'first' | 'previous',
): number {
  if (pointIndex === 0 && baseline === 'previous') return 0;
  const baselinePoint = baseline === 'first' ? points[0] : points[pointIndex - 1];
  const baselineValue = baselinePoint?.y ?? value;
  if (mode === 'difference') return value - baselineValue;
  return baselineValue === 0 ? 0 : ((value - baselineValue) / Math.abs(baselineValue)) * 100;
}

function displaySeries<TMetadata>(
  series: readonly GenericChartSeries<TMetadata>[],
  comparison: GenericChartAdapterProps<TMetadata>['comparison'],
): readonly GenericChartSeries<TMetadata>[] {
  if (!comparison) return series;
  const baseline = comparison.baseline ?? 'first';
  return series.map((item) => ({
    ...item,
    data: item.data.map((point, pointIndex) => ({
      ...point,
      y: compareValue(point.y, pointIndex, item.data, comparison.mode, baseline),
    })),
  }));
}

function legendOptions(
  visible: boolean,
  position: GenericChartAdapterProps['legendPosition'],
  textPrimary: string,
  textSecondary: string,
  disabled: string,
): Highcharts.LegendOptions {
  const vertical = position === 'left' || position === 'right';
  return {
    enabled: visible,
    align: vertical ? position : 'center',
    verticalAlign: vertical ? 'middle' : position,
    layout: vertical ? 'vertical' : 'horizontal',
    itemStyle: { color: textSecondary },
    itemHoverStyle: { color: textPrimary },
    itemHiddenStyle: { color: disabled },
  };
}

function exportMenuItems(formats: readonly ('png' | 'svg' | 'csv')[]): string[] {
  const itemByFormat = {
    png: 'downloadPNG',
    svg: 'downloadSVG',
    csv: 'downloadCSV',
  } as const;
  return formats.map((format) => itemByFormat[format]);
}

function pointEvent<TMetadata>(
  series: GenericChartSeries<TMetadata>,
  point: GenericChartPoint<TMetadata>,
  seriesIndex: number,
  pointIndex: number,
): GenericChartPointEvent<TMetadata> {
  return {
    series: { id: series.id, name: series.name, type: series.type },
    point,
    seriesIndex,
    pointIndex,
  };
}

function formattedPointX<TMetadata>(
  point: GenericChartPoint<TMetadata>,
  pointIndex: number,
  categories: readonly string[] | undefined,
  dateTimeFormat: Intl.DateTimeFormatOptions | undefined,
): string {
  if (point.x instanceof Date) {
    return new Intl.DateTimeFormat(undefined, dateTimeFormat).format(point.x);
  }
  return point.name ?? String(point.x ?? categories?.[pointIndex] ?? pointIndex + 1);
}

/** Default adapter translating the stable application API into Highcharts options. */
export function HighchartsAdapter<TMetadata>({
  series,
  title,
  subtitle,
  height,
  multiColor,
  interactive,
  legendVisible,
  legendPosition,
  xAxis,
  yAxis,
  tooltip,
  thresholds,
  comparison,
  exportOptions,
  onPointClick,
  ariaLabel,
}: GenericChartAdapterProps<TMetadata>) {
  const theme = useTheme();

  // Series normalization and Highcharts option construction are the only
  // resource-heavy transformations in this component, so they share one memo.
  const options = useMemo<Highcharts.Options>(() => {
    const renderedSeries = displaySeries(series, comparison);
    const colors = internalColors(theme.palette.primary.main, theme.palette.secondary.main);
    const formats = exportOptions?.formats ?? DEFAULT_FORMATS;
    const isPercentComparison = comparison?.mode === 'percent';

    const highchartsSeries = renderedSeries.map((item, seriesIndex) => {
      const color = item.color ?? (multiColor ? colors[seriesIndex % colors.length] : colors[0]);
      const isCircular = item.type === 'pie' || item.type === 'donut';
      const data = item.data.map((point, pointIndex) => ({
        id: point.id,
        name:
          point.name ?? (typeof point.x === 'string' ? point.x : xAxis?.categories?.[pointIndex]),
        x:
          point.x instanceof Date
            ? point.x.getTime()
            : typeof point.x === 'number'
              ? point.x
              : undefined,
        y: point.y,
        color:
          point.color ??
          (isCircular && multiColor ? colors[pointIndex % colors.length] : undefined),
        events:
          interactive && onPointClick
            ? {
                click: () => onPointClick(pointEvent(item, point, seriesIndex, pointIndex)),
              }
            : undefined,
      }));

      if (isCircular) {
        return {
          type: 'pie',
          id: item.id,
          name: item.name,
          data,
          color,
          cursor: interactive ? 'pointer' : undefined,
          innerSize: item.type === 'donut' ? '62%' : undefined,
        } satisfies Highcharts.SeriesPieOptions;
      }

      return {
        type: chartType(item.type),
        id: item.id,
        name: item.name,
        data,
        color,
        yAxis: item.yAxis,
        stack: item.stack,
        cursor: interactive ? 'pointer' : undefined,
      } satisfies
        | Highcharts.SeriesLineOptions
        | Highcharts.SeriesBarOptions
        | Highcharts.SeriesColumnOptions
        | Highcharts.SeriesAreaOptions;
    });

    return {
      chart: {
        height,
        backgroundColor: 'transparent',
        style: { fontFamily: theme.typography.fontFamily },
        animation: !theme.transitions.getAutoHeightDuration(0) ? false : undefined,
      },
      title: { text: title, style: { color: theme.palette.text.primary } },
      subtitle: { text: subtitle, style: { color: theme.palette.text.secondary } },
      // Baseline first: the module's defaults already give point-by-point
      // arrow-key navigation and a screen-reader description. Overriding them
      // is what silently disabled series navigation on the first attempt.
      accessibility: {
        enabled: true,
        keyboardNavigation: {
          enabled: true,
          focusBorder: {
            enabled: true,
            style: { lineWidth: 2, color: theme.palette.primary.main },
          },
        },
      },
      xAxis: {
        categories: xAxis?.categories ? [...xAxis.categories] : undefined,
        type: xAxis?.type === 'category' ? undefined : xAxis?.type,
        min: xAxis?.min,
        max: xAxis?.max,
        title: { text: xAxis?.title, style: { color: theme.palette.text.secondary } },
        labels: {
          style: { color: theme.palette.text.secondary },
          formatter: xAxis?.labelFormatter
            ? function () {
                return xAxis.labelFormatter?.(this.value) ?? String(this.value);
              }
            : undefined,
        },
        lineColor: theme.palette.divider,
        tickColor: theme.palette.divider,
        gridLineColor: theme.palette.divider,
      },
      yAxis: {
        min: yAxis?.min,
        max: yAxis?.max,
        title: { text: yAxis?.title, style: { color: theme.palette.text.secondary } },
        labels: {
          style: { color: theme.palette.text.secondary },
          format: isPercentComparison ? '{value}%' : undefined,
          formatter: yAxis?.labelFormatter
            ? function () {
                return yAxis.labelFormatter?.(this.value) ?? String(this.value);
              }
            : undefined,
        },
        lineColor: theme.palette.divider,
        tickColor: theme.palette.divider,
        gridLineColor: theme.palette.divider,
        plotLines: thresholds?.map((threshold) => ({
          value: threshold.value,
          color: threshold.color ?? theme.palette.warning.main,
          dashStyle: threshold.dashStyle ?? 'Dash',
          width: threshold.width ?? 2,
          label: threshold.label
            ? { text: threshold.label, style: { color: theme.palette.text.secondary } }
            : undefined,
          zIndex: 4,
        })),
      },
      legend: legendOptions(
        legendVisible,
        legendPosition,
        theme.palette.text.primary,
        theme.palette.text.secondary,
        theme.palette.action.disabled,
      ),
      tooltip: {
        enabled: tooltip?.enabled ?? true,
        backgroundColor: theme.palette.background.paper,
        borderColor: theme.palette.divider,
        style: { color: theme.palette.text.primary },
        valuePrefix: tooltip?.valuePrefix,
        valueSuffix: tooltip?.valueSuffix ?? (isPercentComparison ? '%' : undefined),
        formatter: tooltip?.formatter
          ? function () {
              const seriesIndex = this.series.index;
              const pointIndex = this.index;
              const sourceSeries = renderedSeries[seriesIndex];
              const sourcePoint = sourceSeries?.data[pointIndex];
              if (!sourceSeries || !sourcePoint) return false;
              const prefix = tooltip.valuePrefix ?? '';
              const suffix = tooltip.valueSuffix ?? (isPercentComparison ? '%' : '');
              return tooltip.formatter?.({
                ...pointEvent(sourceSeries, sourcePoint, seriesIndex, pointIndex),
                formattedX: formattedPointX(
                  sourcePoint,
                  pointIndex,
                  xAxis?.categories,
                  tooltip.dateTimeFormat,
                ),
                formattedY: `${prefix}${Highcharts.numberFormat(sourcePoint.y, 2)}${suffix}`,
              });
            }
          : undefined,
      },
      plotOptions: {
        series: { animation: true, marker: { enabled: true } },
        pie: {
          borderColor: theme.palette.background.paper,
          dataLabels: {
            style: { color: theme.palette.text.primary, textOutline: 'none' },
          },
        },
      },
      exporting: {
        enabled: exportOptions?.enabled ?? false,
        filename: exportOptions?.filename,
        buttons: { contextButton: { menuItems: exportMenuItems(formats) } },
      },
      credits: { enabled: false },
      series: highchartsSeries,
    };
  }, [
    comparison,
    exportOptions,
    height,
    interactive,
    legendPosition,
    legendVisible,
    multiColor,
    onPointClick,
    series,
    subtitle,
    theme,
    thresholds,
    title,
    tooltip,
    xAxis,
    yAxis,
  ]);

  // No `role="img"` here on purpose. It collapses everything inside into a
  // single image for assistive tech, which hides the per-point structure the
  // accessibility module builds — the chart gets announced but cannot be
  // explored. A labelled group leaves that structure reachable.
  return (
    <div role="group" aria-label={ariaLabel}>
      <HighchartsReact highcharts={Highcharts} options={options} />
    </div>
  );
}
