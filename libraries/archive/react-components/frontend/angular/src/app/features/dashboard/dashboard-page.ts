import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';

import { GenericCard } from '../../shared/generic-card/generic-card';
import { GenericChart } from '../../shared/generic-chart/generic-chart';
import { SnackbarService } from '../../shared/snackbar/snackbar.service';

import type { ChartPointEvent, ChartSeries } from '../../shared/generic-chart/chart.types';

interface PointMeta {
  quarter: string;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

/**
 * Dashboard — the Angular counterpart of the React `DashboardPage`.
 *
 * The drill-down rule carries over: the chart reports a typed point event and
 * the **page** decides what that means. Here it raises a snackbar; another page
 * could open a dialog or navigate, without the chart knowing either exists.
 */
@Component({
  selector: 'app-dashboard-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GenericCard, GenericChart],
  template: `
    <div class="dashboard">
      <app-generic-card title="Monthly revenue" subtitle="Year-over-year" icon="show_chart" size="expanded">
        <app-generic-chart
          [series]="revenue()"
          [xAxis]="{ categories: months }"
          [yAxis]="{ title: 'USD (k)' }"
          [tooltip]="{ valuePrefix: '$', valueSuffix: 'k' }"
          [thresholds]="[{ value: 70, label: 'Target' }]"
          [interactive]="true"
          [exportEnabled]="true"
          exportFilename="monthly-revenue"
          ariaLabel="Monthly revenue chart"
          (pointClick)="onPoint($event)"
        />
      </app-generic-card>

      <app-generic-card title="Category mix" subtitle="Share of revenue" icon="donut_small" size="expanded">
        <app-generic-chart
          [series]="mix()"
          [interactive]="true"
          ariaLabel="Category mix chart"
          (pointClick)="onPoint($event)"
        />
      </app-generic-card>
    </div>
  `,
  styles: `
    :host { display: block; padding: 16px 0; }
    .dashboard {
      display: grid;
      gap: 16px;
      grid-template-columns: 1fr;
    }
    @media (min-width: 1280px) {
      .dashboard { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
  `,
})
export class DashboardPage {
  private readonly snackbar = inject(SnackbarService);
  protected readonly dialog = inject(MatDialog);

  protected readonly months = MONTHS;

  protected readonly revenue = signal<ChartSeries<PointMeta>[]>([
    {
      id: 'actual',
      name: 'Actual',
      type: 'column',
      data: [48, 54, 61, 58, 72, 80].map((y, i) => ({
        x: MONTHS[i],
        y,
        metadata: { quarter: i < 3 ? 'Q1' : 'Q2' },
      })),
    },
    {
      id: 'forecast',
      name: 'Forecast',
      type: 'line',
      data: [50, 55, 59, 63, 70, 77].map((y, i) => ({
        x: MONTHS[i],
        y,
        metadata: { quarter: i < 3 ? 'Q1' : 'Q2' },
      })),
    },
  ]);

  protected readonly mix = signal<ChartSeries<PointMeta>[]>([
    {
      id: 'mix',
      name: 'Share',
      type: 'donut',
      data: [
        { name: 'Beauty', y: 34, metadata: { quarter: 'Q2' } },
        { name: 'Fragrances', y: 26, metadata: { quarter: 'Q2' } },
        { name: 'Furniture', y: 22, metadata: { quarter: 'Q2' } },
        { name: 'Groceries', y: 18, metadata: { quarter: 'Q2' } },
      ],
    },
  ]);

  protected onPoint(event: ChartPointEvent<PointMeta>): void {
    const label = event.point.name ?? String(event.point.x ?? event.pointIndex + 1);
    this.snackbar.info(
      `${event.series.name} · ${label}: ${String(event.point.y)} (${event.point.metadata?.quarter ?? '—'})`,
    );
  }
}
