import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { GenericChart } from './GenericChart';

import type { GenericChartAdapterProps, GenericChartSeries } from './GenericChart.types';

interface DemoMetadata {
  code: string;
}

const SERIES: readonly GenericChartSeries<DemoMetadata>[] = [
  {
    id: 'sales',
    name: 'Sales',
    type: 'line',
    data: [{ name: 'Jan', y: 12, metadata: { code: 'JAN' } }],
  },
];

function TestAdapter({
  ariaLabel,
  legendVisible,
  interactive,
  onPointClick,
}: GenericChartAdapterProps<DemoMetadata>) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      data-legend-visible={String(legendVisible)}
      onClick={() => {
        if (interactive) {
          onPointClick?.({
            series: { id: 'sales', name: 'Sales', type: 'line' },
            point: SERIES[0].data[0],
            pointIndex: 0,
            seriesIndex: 0,
          });
        }
      }}
    >
      Test adapter
    </button>
  );
}

describe('GenericChart', () => {
  it('prioritizes loading, error, and empty states before rendering an adapter', () => {
    const { rerender } = render(
      <GenericChart series={SERIES} state={{ loading: true }} adapter={TestAdapter} />,
    );
    expect(screen.getByLabelText('Loading chart')).toBeInTheDocument();

    rerender(
      <GenericChart series={SERIES} state={{ error: 'Chart failed' }} adapter={TestAdapter} />,
    );
    expect(screen.getByText('Chart failed')).toBeInTheDocument();

    rerender(
      <GenericChart
        series={[]}
        state={{ emptyMessage: 'No revenue recorded' }}
        adapter={TestAdapter}
      />,
    );
    expect(screen.getByText('No revenue recorded')).toBeInTheDocument();
  });

  it('passes stable chart configuration and interactive point data to the parent', async () => {
    const user = userEvent.setup();
    const onPointClick = vi.fn();
    render(
      <GenericChart
        title="Revenue"
        series={SERIES}
        interactive
        legend={{ visible: true, toggleable: true }}
        onPointClick={onPointClick}
        adapter={TestAdapter}
      />,
    );

    const chart = screen.getByRole('button', { name: 'Revenue chart' });
    expect(chart).toHaveAttribute('data-legend-visible', 'true');
    await user.click(screen.getByRole('button', { name: 'Hide chart legend' }));
    expect(chart).toHaveAttribute('data-legend-visible', 'false');

    await user.click(chart);
    expect(onPointClick).toHaveBeenCalledWith(
      expect.objectContaining({
        point: expect.objectContaining({ y: 12, metadata: { code: 'JAN' } }),
        series: expect.objectContaining({ id: 'sales' }),
      }),
    );
  });
});
