import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import IconButton from '@mui/material/IconButton';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

import { timeLabel } from '../../../foundation';

export interface ChartPoint {
  label: string;
  value: number;
}

export interface DashboardChartCardProps {
  title: string;
  points: ChartPoint[];
  /** Required. The text a screen reader gets instead of the drawing. */
  summary: string;
  valueFormatter?: (value: number) => string;
  ranges?: { id: string; label: string }[];
  activeRange?: string;
  updatedAt?: string;
  loading?: boolean;
  emptyMessage?: string;
  onRangeChange?: (id: string) => void;
}

/**
 * A chart with a mandatory text summary and a table view.
 *
 * `summary` is **required**, not optional: *"Revenue increased from ₹4.2M to
 * ₹4.8M over the last 30 days."* A chart is a picture, and a picture with no
 * text is nothing at all to a screen reader. Making the prop required means a
 * chart cannot ship without one.
 *
 * The table toggle is the second half of the same idea — and it is useful to
 * everyone, not only assistive-technology users, because reading an exact
 * figure off a line is guesswork.
 */
export function DashboardChartCard({
  title,
  points,
  summary,
  valueFormatter = (value) => String(value),
  ranges,
  activeRange,
  updatedAt,
  loading = false,
  emptyMessage = 'No data for this period',
  onRangeChange,
}: DashboardChartCardProps) {
  const [showTable, setShowTable] = useState(false);

  const max = Math.max(...points.map((point) => point.value), 0);
  const min = Math.min(...points.map((point) => point.value), 0);
  const span = max - min || 1;

  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
          <Typography variant="subtitle2" fontWeight={700}>
            {title}
          </Typography>

          <Stack direction="row" spacing={1} alignItems="center">
            {ranges && onRangeChange ? (
              <ToggleButtonGroup
                exclusive
                size="small"
                value={activeRange}
                aria-label="Date range"
                onChange={(_event, next: string | null) => {
                  if (next) onRangeChange(next);
                }}
              >
                {ranges.map((range) => (
                  <ToggleButton key={range.id} value={range.id} sx={{ px: 1, py: 0.25 }}>
                    {range.label}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            ) : null}

            <IconButton
              size="small"
              aria-label={showTable ? 'Show chart' : 'Show data as a table'}
              aria-pressed={showTable}
              onClick={() => {
                setShowTable((current) => !current);
              }}
            >
              <TableChartOutlinedIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Stack>

        {/* The accessible version of the picture, always present. */}
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {loading ? 'Loading…' : points.length === 0 ? emptyMessage : summary}
        </Typography>

        {loading ? (
          <Skeleton variant="rectangular" height={160} sx={{ mt: 2, borderRadius: 1 }} />
        ) : points.length === 0 ? (
          <Box
            sx={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Typography variant="body2" color="text.secondary">
              {emptyMessage}
            </Typography>
          </Box>
        ) : showTable ? (
          <Box sx={{ mt: 1, maxHeight: 200, overflowY: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Period</TableCell>
                  <TableCell align="right">Value</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {points.map((point) => (
                  <TableRow key={point.label}>
                    <TableCell>{point.label}</TableCell>
                    <TableCell align="right">{valueFormatter(point.value)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        ) : (
          <Box
            component="svg"
            // The drawing itself is decorative; the summary above carries it.
            aria-hidden
            viewBox={`0 0 ${String(Math.max(points.length - 1, 1))} 100`}
            preserveAspectRatio="none"
            sx={{ width: '100%', height: 160, mt: 2, color: 'primary.main' }}
          >
            <polyline
              points={points
                .map(
                  (point, index) =>
                    `${String(index)},${String(100 - ((point.value - min) / span) * 100)}`,
                )
                .join(' ')}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
            />
          </Box>
        )}

        {updatedAt ? (
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
            {`Last updated ${timeLabel(updatedAt)}`}
          </Typography>
        ) : null}
      </CardContent>
    </Card>
  );
}
