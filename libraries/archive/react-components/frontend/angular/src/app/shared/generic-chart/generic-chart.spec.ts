import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHighcharts } from 'highcharts-angular';
import { describe, expect, it } from 'vitest';

import { GenericChart } from './generic-chart';

import type { ChartSeries } from './chart.types';

@Component({
  imports: [GenericChart],
  template: `
    <app-generic-chart
      [series]="series()"
      title="Revenue"
      ariaLabel="Revenue chart"
      [loading]="loading()"
      [error]="error()"
    />
  `,
})
class Host {
  readonly series = signal<ChartSeries[]>([
    { id: 'r', name: 'Revenue', type: 'column', data: [{ x: 'Jan', y: 10 }] },
  ]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
}

/**
 * Scope note: jsdom has no SVG layout, so Highcharts never builds its point
 * structure here. Point-by-point keyboard navigation was verified in real
 * Chrome (tabindex="0", per-point labels such as "Jan, $48k. Actual.").
 *
 * What these tests guard is the wrapper contract — which is precisely where the
 * React bug lived.
 */
describe('GenericChart', () => {
  /**
   * `provideHighcharts` supplies the HIGHCHARTS_LOADER token the chart service
   * injects. It is an app-level provider in `app.config.ts`, so the TestBed
   * needs it too — omitting it fails with NG0201 rather than rendering.
   */
  const providers = [provideHighcharts()];

  async function render() {
    await TestBed.configureTestingModule({ imports: [Host], providers }).compileComponents();
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    return fixture;
  }

  it('wraps the chart in a labelled group, never an image', async () => {
    const fixture = await render();
    const el = fixture.nativeElement as HTMLElement;

    const wrapper = el.querySelector('div[role]');
    expect(wrapper?.getAttribute('role')).toBe('group');
    expect(wrapper?.getAttribute('aria-label')).toBe('Revenue chart');

    // The regression guard: `role="img"` on the wrapper collapses the whole
    // subtree into one opaque image and hides every per-point node.
    expect(el.querySelector('app-generic-chart > div[role="img"]')).toBeNull();
  });

  it('shows the empty state when no series has data', async () => {
    await TestBed.configureTestingModule({ imports: [Host], providers }).compileComponents();
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.series.set([]);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('No chart data available');
  });

  it('prioritises loading over error and data', async () => {
    const fixture = await render();
    fixture.componentInstance.loading.set(true);
    fixture.componentInstance.error.set('Boom');
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(el.textContent).not.toContain('Boom');
  });

  it('shows an error instead of the chart', async () => {
    const fixture = await render();
    fixture.componentInstance.error.set('Request failed');
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Request failed');
    expect(el.querySelector('div[role="group"]')).toBeNull();
  });
});
