import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import { GenericCard } from '../../shared/generic-card/generic-card';
import { GenericChart } from '../../shared/generic-chart/generic-chart';
import { SnackbarService } from '../../shared/snackbar/snackbar.service';

import type { ChartPointEvent, ChartSeries } from '../../shared/generic-chart/chart.types';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

function series(id: string, name: string, type: ChartSeries['type'], values: number[]): ChartSeries {
  return {
    id,
    name,
    type,
    data: values.map((y, index) => ({ id: `${id}-${String(index)}`, x: MONTHS[index], y })),
  };
}

/**
 * Generic Chart showcase.
 *
 * Every chart here is keyboard navigable point by point — the accessibility
 * module is loaded by the shared component's provider, and the wrapper is a
 * labelled `role="group"` rather than `role="img"`. Tab to a chart, then use
 * the arrow keys: the focus border moves between points and each one is
 * announced. See `generic-chart.ts` for why that combination matters.
 */
@Component({
  selector: 'app-generic-chart-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GenericCard, GenericChart, MatButtonModule, MatSlideToggleModule],
  template: `
    <div class="charts">
      <app-generic-card title="Column and line" subtitle="Two series, shared axis" icon="bar_chart">
        <app-generic-chart
          [series]="combo"
          [xAxis]="{ categories: months }"
          [yAxis]="{ title: 'Revenue' }"
          [tooltip]="{ valuePrefix: '$', valueSuffix: 'k' }"
          [thresholds]="[{ value: 55, label: 'Target' }]"
          [interactive]="true"
          [exportEnabled]="true"
          exportFilename="revenue"
          ariaLabel="Monthly revenue: actual versus forecast"
          (pointClick)="onPoint($event)"
        />
        <p class="charts__note">
          Interactive: click a column. Also exportable — the menu renders offline, so chart data
          never leaves the browser.
        </p>
      </app-generic-card>

      <app-generic-card title="Donut" subtitle="Category split" icon="donut_large">
        <app-generic-chart
          [series]="donut"
          [height]="280"
          [interactive]="true"
          ariaLabel="Revenue split by category"
          (pointClick)="onPoint($event)"
        />
      </app-generic-card>

      <app-generic-card title="States" subtitle="Loading, error and empty" icon="pending">
        <div class="charts__controls">
          <mat-slide-toggle [checked]="loading()" (change)="loading.set($any($event).checked)">
            Loading
          </mat-slide-toggle>
          <mat-slide-toggle [checked]="failed()" (change)="failed.set($any($event).checked)">
            Failed
          </mat-slide-toggle>
          <mat-slide-toggle [checked]="noData()" (change)="noData.set($any($event).checked)">
            No data
          </mat-slide-toggle>
        </div>
        <app-generic-chart
          [series]="stateSeries()"
          [xAxis]="{ categories: months }"
          [height]="260"
          [loading]="loading()"
          [error]="errorText()"
          emptyMessage="No results for this period"
          ariaLabel="State demonstration chart"
        />
      </app-generic-card>
    </div>
  `,
  styles: `
    :host { display: block; padding: 16px 0; }
    .charts {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
      gap: 24px;
      align-items: start;
    }
    .charts__controls {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      margin-bottom: 12px;
    }
    .charts__note {
      margin: 12px 0 0;
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-body-medium);
    }
  `,
})
export class GenericChartPage {
  private readonly snackbar = inject(SnackbarService);

  protected readonly months = MONTHS;

  protected readonly combo: ChartSeries[] = [
    series('actual', 'Actual', 'column', [48, 52, 61, 44, 68, 72]),
    series('forecast', 'Forecast', 'line', [45, 50, 58, 52, 64, 70]),
  ];

  protected readonly donut: ChartSeries[] = [
    {
      id: 'split',
      name: 'Revenue',
      type: 'donut',
      data: [
        { id: 'beauty', name: 'Beauty', y: 34 },
        { id: 'furniture', name: 'Furniture', y: 26 },
        { id: 'groceries', name: 'Groceries', y: 22 },
        { id: 'fragrances', name: 'Fragrances', y: 18 },
      ],
    },
  ];

  protected readonly loading = signal(false);
  protected readonly failed = signal(false);
  protected readonly noData = signal(false);

  protected readonly errorText = computed(() =>
    this.failed() ? 'Could not load chart data.' : null,
  );

  /** An empty series array is what drives the component's empty state. */
  protected readonly stateSeries = computed<ChartSeries[]>(() =>
    this.noData() ? [] : [series('sample', 'Sessions', 'area', [21, 30, 28, 39, 44, 38])],
  );

  protected onPoint(event: ChartPointEvent): void {
    const label = event.point.name ?? String(event.point.x ?? event.pointIndex);
    this.snackbar.info(`${event.series.name} · ${label}: ${String(event.point.y)}`);
  }
}
