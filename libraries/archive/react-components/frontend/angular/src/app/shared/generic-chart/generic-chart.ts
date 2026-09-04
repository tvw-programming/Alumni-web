import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { HighchartsChartComponent } from 'highcharts-angular';

import { ThemeStore } from '../../core/theme/theme-store';

import type {
  ChartAxisConfig,
  ChartPoint,
  ChartPointEvent,
  ChartSeries,
  ChartThreshold,
  ChartTooltipConfig,
} from './chart.types';
import type { Options, SeriesOptionsType } from 'highcharts';

/**
 * Library-agnostic chart shell.
 *
 * Ported from the React `GenericChart` + `HighchartsAdapter` pair. The shell
 * owns the states a chart can be in and the accessibility contract; Highcharts
 * is confined to the option builder below.
 *
 * ## Accessibility — do not regress this
 *
 * The React implementation shipped with a defect worth repeating here so it is
 * not reintroduced:
 *
 * 1. The accessibility module was disabled, so charts had no keyboard
 *    navigation at all.
 * 2. The wrapper used `role="img"`, which collapses its entire subtree into a
 *    single opaque image for assistive tech. Enabling the module alone did
 *    **not** help, because every per-point node stayed hidden behind that role.
 *
 * So: the accessibility module is loaded by the app-level `provideHighcharts`
 * in `app.config.ts` (no caller can forget to opt in), and the wrapper is a
 * labelled `role="group"`. Over-configuring
 * `keyboardNavigation.seriesNavigation` silently disabled point navigation in
 * React, so only the focus-border colour is overridden here.
 */
@Component({
  selector: 'app-generic-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HighchartsChartComponent, MatIconModule, MatProgressSpinnerModule],
  template: `
    @if (loading()) {
      <div class="chart__state" [style.height.px]="height()" aria-busy="true" aria-label="Loading chart">
        <mat-spinner diameter="32" />
      </div>
    } @else if (error()) {
      <div class="chart__state chart__state--error" role="alert">
        <mat-icon aria-hidden="true">error_outline</mat-icon>
        <span>{{ error() }}</span>
      </div>
    } @else if (!hasData()) {
      <div class="chart__state chart__state--empty" [style.height.px]="height()">
        <mat-icon aria-hidden="true">bar_chart</mat-icon>
        <span>{{ emptyMessage() }}</span>
      </div>
    } @else {
      <!--
        role="group", never role="img". See the class comment: an image role
        hides the per-point structure the accessibility module builds, leaving
        the chart announced but impossible to explore by keyboard.
      -->
      <div role="group" [attr.aria-label]="resolvedAriaLabel()">
        <highcharts-chart [options]="options()" />
      </div>
    }
  `,
  styles: `
    :host { display: block; min-width: 0; }
    .chart__state {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      color: var(--mat-sys-on-surface-variant);
    }
    .chart__state--error { color: var(--mat-sys-error); }
    .chart__state--empty { flex-direction: column; }
  `,
})
export class GenericChart<TMetadata = unknown> {
  private readonly theme = inject(ThemeStore);

  readonly series = input.required<readonly ChartSeries<TMetadata>[]>();
  readonly title = input<string>();
  readonly subtitle = input<string>();
  readonly height = input(320);
  readonly multiColor = input(true);
  readonly interactive = input(false);
  readonly legendVisible = input(true);
  readonly xAxis = input<ChartAxisConfig>();
  readonly yAxis = input<ChartAxisConfig>();
  readonly tooltip = input<ChartTooltipConfig>();
  readonly thresholds = input<readonly ChartThreshold[]>();
  readonly exportEnabled = input(false);
  readonly exportFilename = input('chart');

  readonly loading = input(false);
  readonly error = input<string | null>(null);
  readonly emptyMessage = input('No chart data available');
  readonly ariaLabel = input<string>();

  readonly pointClick = output<ChartPointEvent<TMetadata>>();

  protected readonly hasData = computed(() => this.series().some((s) => s.data.length > 0));

  protected readonly resolvedAriaLabel = computed(
    () => this.ariaLabel() ?? (this.title() ? `${this.title()} chart` : 'Data chart'),
  );

  /**
   * The one resource-heavy transformation in this component, so it gets the one
   * memo. `computed` re-runs only when an input it actually read changes.
   */
  protected readonly options = computed<Options>(() => {
    const dark = this.theme.isDark();
    const text = dark ? '#e3e2e6' : '#1a1c1e';
    const muted = dark ? '#c4c6cf' : '#43474e';
    const palette = ['#4f8cc9', '#e8833a', '#54b567', '#c8553d', '#8a6ec4', '#3aa8a8'];

    const rendered = this.series().map((item, seriesIndex) => {
      const circular = item.type === 'pie' || item.type === 'donut';
      return {
        type: circular ? 'pie' : item.type,
        id: item.id,
        name: item.name,
        color: item.color ?? (this.multiColor() ? palette[seriesIndex % palette.length] : palette[0]),
        innerSize: item.type === 'donut' ? '62%' : undefined,
        cursor: this.interactive() ? 'pointer' : undefined,
        data: item.data.map((point, pointIndex) => ({
          id: point.id,
          name: point.name ?? (typeof point.x === 'string' ? point.x : undefined),
          y: point.y,
          color:
            point.color ?? (circular && this.multiColor() ? palette[pointIndex % palette.length] : undefined),
          events: this.interactive()
            ? { click: () => { this.emitPoint(item, point, seriesIndex, pointIndex); } }
            : undefined,
        })),
      } as SeriesOptionsType;
    });

    return {
      chart: { height: this.height(), backgroundColor: 'transparent', style: { fontFamily: 'inherit' } },
      title: { text: this.title() ?? undefined, style: { color: text } },
      subtitle: { text: this.subtitle() ?? undefined, style: { color: muted } },
      credits: { enabled: false },
      accessibility: {
        enabled: true,
        keyboardNavigation: {
          enabled: true,
          focusBorder: { enabled: true, style: { lineWidth: 2, color: '#4f8cc9' } },
        },
        point: {
          valuePrefix: this.tooltip()?.valuePrefix,
          valueSuffix: this.tooltip()?.valueSuffix,
        },
      },
      plotOptions: {
        // Opaque fills make the series drawn last hide everything under it, so
        // an overlapping area chart reads as a single series. Matches the
        // React landing page, which set the same opacity by hand.
        area: { fillOpacity: 0.3, marker: { enabled: false } },
      },
      legend: { enabled: this.legendVisible(), itemStyle: { color: muted } },
      xAxis: {
        categories: this.xAxis()?.categories ? [...this.xAxis()!.categories!] : undefined,
        title: { text: this.xAxis()?.title, style: { color: muted } },
        labels: { style: { color: muted } },
      },
      yAxis: {
        min: this.yAxis()?.min,
        max: this.yAxis()?.max,
        title: { text: this.yAxis()?.title, style: { color: muted } },
        labels: { style: { color: muted } },
        plotLines: this.thresholds()?.map((t) => ({
          value: t.value,
          color: t.color ?? '#c8553d',
          width: 2,
          dashStyle: 'Dash',
          label: { text: t.label, style: { color: muted } },
        })),
      },
      tooltip: {
        valuePrefix: this.tooltip()?.valuePrefix,
        valueSuffix: this.tooltip()?.valueSuffix,
      },
      exporting: {
        enabled: this.exportEnabled(),
        filename: this.exportFilename(),
        // Offline: chart data never leaves the browser to be rendered.
        fallbackToExportServer: false,
      },
      series: rendered,
    };
  });

  private emitPoint(
    series: ChartSeries<TMetadata>,
    point: ChartPoint<TMetadata>,
    seriesIndex: number,
    pointIndex: number,
  ): void {
    this.pointClick.emit({
      series: { id: series.id, name: series.name, type: series.type },
      point,
      pointIndex,
      seriesIndex,
    });
  }
}
