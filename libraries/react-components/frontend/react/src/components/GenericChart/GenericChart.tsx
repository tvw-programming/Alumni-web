import BarChartIcon from '@mui/icons-material/BarChart';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

import { HighchartsAdapter } from './HighchartsAdapter';

import type { GenericChartProps } from './GenericChart.types';

function hasChartData<TMetadata>(series: GenericChartProps<TMetadata>['series']): boolean {
  return series.some((item) => item.data.length > 0);
}

/** Stable, library-agnostic chart shell. Business state and drill-down flow stay in parents. */
export function GenericChart<TMetadata = unknown>({
  series,
  title,
  subtitle,
  height = 320,
  multiColor = true,
  interactive = false,
  legend = {},
  xAxis,
  yAxis,
  tooltip,
  thresholds,
  comparison,
  exportOptions,
  state = {},
  onPointClick,
  adapter: Adapter = HighchartsAdapter,
  ariaLabel = title ? `${title} chart` : 'Data chart',
}: GenericChartProps<TMetadata>) {
  const [legendVisible, setLegendVisible] = useState(legend.visible ?? true);

  if (state.loading) {
    return (
      <Stack
        spacing={1}
        height={height}
        aria-busy="true"
        aria-label={state.loadingLabel ?? 'Loading chart'}
      >
        <Skeleton variant="text" width="36%" height={34} />
        <Skeleton variant="rounded" width="100%" sx={{ flexGrow: 1 }} />
      </Stack>
    );
  }

  if (state.error !== undefined && state.error !== null) {
    return (
      <Alert severity="error" icon={<ErrorOutlineIcon />}>
        {state.error}
      </Alert>
    );
  }

  if (!hasChartData(series)) {
    return (
      <Stack
        height={height}
        alignItems="center"
        justifyContent="center"
        spacing={1}
        color="text.secondary"
      >
        <BarChartIcon fontSize="large" aria-hidden="true" />
        <Typography>{state.emptyMessage ?? 'No chart data available'}</Typography>
      </Stack>
    );
  }

  return (
    <Box position="relative" minWidth={0}>
      {legend.toggleable && (
        <Tooltip title={legendVisible ? 'Hide chart legend' : 'Show chart legend'}>
          <IconButton
            size="small"
            aria-label={legendVisible ? 'Hide chart legend' : 'Show chart legend'}
            onClick={() => setLegendVisible((visible) => !visible)}
            sx={{ position: 'absolute', top: 0, left: 0, zIndex: 1 }}
          >
            {legendVisible ? <VisibilityOffIcon /> : <VisibilityIcon />}
          </IconButton>
        </Tooltip>
      )}
      <Adapter
        series={series}
        title={title}
        subtitle={subtitle}
        height={height}
        multiColor={multiColor}
        interactive={interactive}
        legendVisible={legendVisible}
        legendPosition={legend.position ?? 'bottom'}
        xAxis={xAxis}
        yAxis={yAxis}
        tooltip={tooltip}
        thresholds={thresholds}
        comparison={comparison}
        exportOptions={exportOptions}
        onPointClick={onPointClick}
        ariaLabel={ariaLabel}
      />
    </Box>
  );
}
