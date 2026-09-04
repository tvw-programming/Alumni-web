/* eslint-disable testing-library/no-node-access --
 * Highcharts renders its accessibility structure as SVG and injected proxy
 * containers, none of which is reachable through a role or label query. The
 * rule exists to stop tests reaching past their component into implementation
 * detail; here the third-party DOM *is* the contract under test, so querying it
 * directly is the only way to prove the module is live. */
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { GenericChart } from './GenericChart';

import type { GenericChartSeries } from './GenericChart.types';

const series: GenericChartSeries[] = [
  {
    id: 'revenue',
    name: 'Revenue',
    type: 'column',
    data: [
      { x: 'Jan', y: 10 },
      { x: 'Feb', y: 20 },
      { x: 'Mar', y: 30 },
    ],
  },
];

/**
 * Guards the accessibility contract of the chart shell.
 *
 * Scope note: jsdom has no SVG layout, so it cannot answer "does ArrowRight
 * move the focus border from Jan to Feb". That was verified in real Chrome over
 * CDP; see `documentation/features/generic-chart.md`. What jsdom *can* prove is
 * that the module is loaded and the wrapper does not undo it — which is exactly
 * where the bug was.
 */
describe('GenericChart accessibility', () => {
  it('does not collapse the chart into a single image for assistive tech', async () => {
    render(<GenericChart series={series} title="Revenue" ariaLabel="Revenue chart" />);
    await waitFor(() => {
      expect(document.querySelector('.highcharts-container')).not.toBeNull();
    });

    // Regression guard for the real defect: a `role="img"` wrapper hides every
    // per-point node from screen readers, so the chart is announced but cannot
    // be explored. Nothing in the wrapper chain may reintroduce that.
    const labelled = screen.getByLabelText('Revenue chart');
    expect(labelled.getAttribute('role')).toBe('group');
    expect(labelled.querySelector('[role="img"]')).toBeNull();
  });

  it('loads the accessibility module rather than shipping an inert config', async () => {
    render(<GenericChart series={series} title="Revenue" />);

    // The module builds proxy containers around the chart. Their absence would
    // mean `accessibility.enabled: true` was set on a module that never loaded.
    await waitFor(() => {
      expect(document.querySelectorAll('[class*="a11y-proxy-container"]').length).toBeGreaterThan(
        0,
      );
    });
  });

  it('makes the chart reachable by keyboard', async () => {
    render(<GenericChart series={series} title="Revenue" />);

    await waitFor(() => {
      const container = document.querySelector('.highcharts-container');
      // tabindex=0 is what puts the chart in the tab order; arrow keys then
      // move between points from there.
      expect(container?.getAttribute('tabindex')).toBe('0');
    });
  });

  it('emits a screen-reader description of the chart', async () => {
    render(<GenericChart series={series} title="Revenue" subtitle="Year to date" />);

    await waitFor(() => {
      const region = document.querySelector('[id^="highcharts-screen-reader-region"]');
      expect(region?.textContent ?? '').toMatch(/chart/i);
    });
  });

  it('keeps the caller supplied label available', async () => {
    render(<GenericChart series={series} title="Revenue" ariaLabel="Monthly revenue chart" />);

    expect(await screen.findByLabelText('Monthly revenue chart')).toBeInTheDocument();
  });
});
