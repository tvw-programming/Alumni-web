import AnalyticsOutlinedIcon from '@mui/icons-material/AnalyticsOutlined';
import BarChartIcon from '@mui/icons-material/BarChart';
import DonutLargeIcon from '@mui/icons-material/DonutLarge';
import InsightsIcon from '@mui/icons-material/Insights';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useCallback, useState } from 'react';

import { GenericCard } from '@/components/GenericCard';
import {
  GenericChart,
  type GenericChartPointEvent,
  type GenericChartSeries,
} from '@/components/GenericChart';
import { GenericPopup } from '@/components/GenericPopup';

interface ChartMetadata {
  region: string;
  owner: string;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'] as const;

const TREND_SERIES: readonly GenericChartSeries<ChartMetadata>[] = [
  {
    id: 'actual',
    name: 'Actual',
    type: 'area',
    data: [48, 54, 61, 58, 72, 82].map((y, index) => ({
      name: MONTHS[index],
      y,
      metadata: { region: 'Global', owner: 'Revenue team' },
    })),
  },
  {
    id: 'target',
    name: 'Target',
    type: 'line',
    data: [50, 56, 60, 65, 70, 78].map((y, index) => ({
      name: MONTHS[index],
      y,
      metadata: { region: 'Global', owner: 'Planning team' },
    })),
  },
];

const REGION_SERIES: readonly GenericChartSeries<ChartMetadata>[] = [
  {
    id: 'regions',
    name: 'Pipeline',
    type: 'bar',
    data: [
      { name: 'North', y: 72, metadata: { region: 'North', owner: 'Ava' } },
      { name: 'South', y: 54, metadata: { region: 'South', owner: 'Noah' } },
      { name: 'East', y: 64, metadata: { region: 'East', owner: 'Mia' } },
      { name: 'West', y: 81, metadata: { region: 'West', owner: 'Leo' } },
    ],
  },
];

const CHANNEL_SERIES: readonly GenericChartSeries<ChartMetadata>[] = [
  {
    id: 'channels',
    name: 'Leads',
    type: 'donut',
    data: [
      { name: 'Organic', y: 42, metadata: { region: 'All', owner: 'Growth' } },
      { name: 'Partner', y: 26, metadata: { region: 'All', owner: 'Partnerships' } },
      { name: 'Paid', y: 19, metadata: { region: 'All', owner: 'Performance' } },
      { name: 'Direct', y: 13, metadata: { region: 'All', owner: 'Sales' } },
    ],
  },
];

type PopupContent = 'point' | 'composition' | null;

/** Admin-owned orchestration demonstrating the library-agnostic chart API. */
export function ManageGenericChartPage() {
  const [popup, setPopup] = useState<PopupContent>(null);
  const [selected, setSelected] = useState<GenericChartPointEvent<ChartMetadata> | null>(null);

  // This callback is passed into the memoized adapter option tree, so stabilizing it
  // avoids rebuilding expensive Highcharts configuration on unrelated parent renders.
  const handlePointClick = useCallback((event: GenericChartPointEvent<ChartMetadata>) => {
    setSelected(event);
    setPopup('point');
  }, []);

  const closePopup = useCallback(() => setPopup(null), []);

  return (
    <Stack spacing={3} pb={3}>
      <Stack spacing={0.5}>
        <Typography variant="h5">Generic Chart</Typography>
        <Typography color="text.secondary">
          A stable chart API with a replaceable Highcharts adapter, generic states, exports,
          comparisons, thresholds, and parent-owned drill-down flow.
        </Typography>
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', xl: 'repeat(2, minmax(0, 1fr))' },
          gap: 2,
        }}
      >
        <GenericCard
          header={{
            title: 'Mixed performance',
            subtitle: 'Area + line with target marker',
            icon: <InsightsIcon />,
            badge: <Chip size="small" label="Interactive" color="primary" />,
          }}
          appearance={{ surface: 'glass', size: 'expanded' }}
        >
          <GenericChart
            series={TREND_SERIES}
            xAxis={{ categories: MONTHS }}
            yAxis={{ title: 'Revenue (USD k)' }}
            thresholds={[{ value: 70, label: 'Stretch target' }]}
            tooltip={{ valuePrefix: '$', valueSuffix: 'k' }}
            legend={{ toggleable: true }}
            interactive
            onPointClick={handlePointClick}
            exportOptions={{ enabled: true, filename: 'performance-trend' }}
          />
        </GenericCard>

        <GenericCard
          header={{
            title: 'Regional pipeline',
            subtitle: 'Single-color fallback and custom tooltip',
            icon: <BarChartIcon />,
          }}
          appearance={{ size: 'expanded' }}
        >
          <GenericChart
            series={REGION_SERIES}
            multiColor={false}
            yAxis={{ title: 'Qualified opportunities' }}
            tooltip={{
              formatter: ({ point, formattedY }) =>
                `<strong>${point.name ?? 'Region'}</strong><br/>Pipeline: ${formattedY}`,
            }}
            legend={{ visible: false }}
            interactive
            onPointClick={handlePointClick}
          />
        </GenericCard>

        <GenericCard
          header={{
            title: 'Channel mix',
            subtitle: 'Donut with internal multi-color palette',
            icon: <DonutLargeIcon />,
          }}
          appearance={{ size: 'expanded', surface: 'subtle' }}
        >
          <GenericChart
            series={CHANNEL_SERIES}
            multiColor
            legend={{ position: 'right', toggleable: true }}
            interactive
            onPointClick={handlePointClick}
          />
        </GenericCard>

        <GenericCard
          header={{
            title: 'Month-over-month comparison',
            subtitle: 'Percent change from the previous point',
            icon: <AnalyticsOutlinedIcon />,
          }}
          appearance={{ size: 'expanded' }}
          slots={{
            footer: (
              <Button variant="outlined" onClick={() => setPopup('composition')}>
                Open chart + card popup
              </Button>
            ),
          }}
        >
          <GenericChart
            series={TREND_SERIES.slice(0, 1)}
            xAxis={{ categories: MONTHS }}
            comparison={{ mode: 'percent', baseline: 'previous' }}
            yAxis={{ title: 'Change' }}
            multiColor={false}
            legend={{ visible: false }}
            interactive
            onPointClick={handlePointClick}
          />
        </GenericCard>
      </Box>

      <GenericPopup
        open={popup === 'point'}
        onClose={closePopup}
        size="medium"
        header={{
          title: selected
            ? `${selected.series.name}: ${selected.point.name ?? 'Selected point'}`
            : 'Chart detail',
          description:
            'The chart emitted typed data; this parent selected it and opened the popup.',
        }}
        actions={{ confirmLabel: 'Done', onConfirm: closePopup, hideCancel: true }}
      >
        {selected && (
          <GenericCard
            header={{
              title: selected.point.name ?? 'Data point',
              metric: selected.point.y,
              badge: <Chip label={selected.series.type} size="small" />,
              description: `Series: ${selected.series.name}`,
            }}
            appearance={{ surface: 'subtle' }}
          >
            <Stack spacing={0.5}>
              <Typography variant="body2">Region: {selected.point.metadata?.region}</Typography>
              <Typography variant="body2">Owner: {selected.point.metadata?.owner}</Typography>
              <Typography variant="caption" color="text.secondary">
                Series index {selected.seriesIndex}, point index {selected.pointIndex}
              </Typography>
            </Stack>
          </GenericCard>
        )}
      </GenericPopup>

      <GenericPopup
        open={popup === 'composition'}
        onClose={closePopup}
        size="large"
        header={{
          title: 'Chart and card composition',
          description:
            'GenericPopup receives complete parent content without chart-specific props.',
        }}
        actions={{ confirmLabel: 'Close', onConfirm: closePopup, hideCancel: true }}
        stickyFooter
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 2fr) minmax(220px, 1fr)' },
            gap: 2,
          }}
        >
          <GenericCard header={{ title: 'Pipeline by region' }} appearance={{ size: 'expanded' }}>
            <GenericChart series={REGION_SERIES} multiColor xAxis={{ type: 'category' }} />
          </GenericCard>
          <GenericCard
            header={{
              title: 'Best region',
              metric: 'West',
              description: '81 qualified opportunities',
              badge: <Chip label="+12%" color="success" size="small" />,
            }}
            appearance={{ surface: 'accent' }}
          >
            Parent-composed summary content can sit beside the reusable chart.
          </GenericCard>
        </Box>
      </GenericPopup>
    </Stack>
  );
}
