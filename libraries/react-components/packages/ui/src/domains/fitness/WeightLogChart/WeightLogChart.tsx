import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

export interface WeightEntry {
  date: string;
  weight: number;
}

export interface WeightLogChartProps {
  entries: WeightEntry[];
  unit: 'kg' | 'lb';
  /** Optional target, drawn as a reference line. */
  goalWeight?: number;
  emptyMessage?: string;
}

/**
 * A weight trend with a table view.
 *
 * The **y-axis starts at the data, not at zero**, and the summary says so
 * implicitly by quoting real numbers. A weight chart zeroed at 0 kg flattens
 * every real change into a straight line; one that is not zeroed exaggerates —
 * so the numbers, not the slope, carry the meaning.
 *
 * Weight is emotive data. The summary states the change plainly — "1.4 kg down
 * over 30 days" — with no encouragement, no judgement, and no inference about
 * health.
 */
export function WeightLogChart({
  entries,
  unit,
  goalWeight,
  emptyMessage = 'No entries yet',
}: WeightLogChartProps) {
  const [showTable, setShowTable] = useState(false);

  if (entries.length === 0) {
    return (
      <Card variant="outlined">
        <CardContent>
          <Typography variant="body2" color="text.secondary">
            {emptyMessage}
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const weights = entries.map((entry) => entry.weight);
  const min = Math.min(...weights, goalWeight ?? Infinity);
  const max = Math.max(...weights, goalWeight ?? -Infinity);
  const span = max - min || 1;
  const first = entries[0];
  const last = entries[entries.length - 1];
  const change = last.weight - first.weight;

  const summary = `${last.weight.toFixed(1)} ${unit} today. ${
    change === 0
      ? 'No change'
      : `${Math.abs(change).toFixed(1)} ${unit} ${change < 0 ? 'down' : 'up'}`
  } since ${first.date}.`;

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="subtitle2" fontWeight={700}>
            Weight
          </Typography>
          <IconButton
            size="small"
            aria-label={showTable ? 'Show chart' : 'Show entries as a table'}
            aria-pressed={showTable}
            onClick={() => {
              setShowTable((current) => !current);
            }}
          >
            <TableChartOutlinedIcon fontSize="small" />
          </IconButton>
        </Stack>

        {/* Plain, unemotive, and the accessible version of the plot. */}
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {summary}
        </Typography>

        {showTable ? (
          <Box sx={{ maxHeight: 200, overflowY: 'auto', mt: 1 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell align="right">{`Weight (${unit})`}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.date}>
                    <TableCell>{entry.date}</TableCell>
                    <TableCell align="right">{entry.weight.toFixed(1)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        ) : (
          <Box
            component="svg"
            aria-hidden
            viewBox={`0 0 ${String(Math.max(entries.length - 1, 1))} 100`}
            preserveAspectRatio="none"
            sx={{ width: '100%', height: 140, mt: 1.5, color: 'primary.main' }}
          >
            {goalWeight !== undefined ? (
              <line
                x1={0}
                x2={entries.length - 1}
                y1={100 - ((goalWeight - min) / span) * 100}
                y2={100 - ((goalWeight - min) / span) * 100}
                stroke="currentColor"
                strokeDasharray="2 2"
                strokeWidth={1}
                opacity={0.4}
                vectorEffect="non-scaling-stroke"
              />
            ) : null}
            <polyline
              points={entries
                .map(
                  (entry, index) =>
                    `${String(index)},${String(100 - ((entry.weight - min) / span) * 100)}`,
                )
                .join(' ')}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
            />
          </Box>
        )}

        {goalWeight !== undefined ? (
          <Typography variant="caption" color="text.secondary">
            {`Goal ${goalWeight.toFixed(1)} ${unit}`}
          </Typography>
        ) : null}
      </CardContent>
    </Card>
  );
}
