import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import DownloadIcon from '@mui/icons-material/Download';
import RefreshIcon from '@mui/icons-material/Refresh';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';

import { usePermission } from '@/auth/usePermission';
import { downloadLogs } from '@/utils/errorLogger';

import type { ErrorLogEntry, ErrorLogLevel } from '@/types/errorLog';

interface ErrorLogToolbarProps {
  entries: readonly ErrorLogEntry[];
  filtered: readonly ErrorLogEntry[];
  counts: Record<string, number>;
  level: ErrorLogLevel | 'all';
  onLevelChange: (level: ErrorLogLevel | 'all') => void;
  search: string;
  onSearchChange: (search: string) => void;
  grouped: boolean;
  onGroupedChange: (grouped: boolean) => void;
  onRefresh: () => void;
  onClear: () => void;
  /** Names the channel in the clear button, e.g. "API". */
  channelLabel: string;
}

/**
 * Counts, filters and export controls. Shared by all three tabs so a behavior
 * added here (a new filter, a new export format) reaches every channel at once.
 *
 * Export writes whatever is currently filtered, not the whole log — the export
 * should match what the operator is looking at.
 */
export function ErrorLogToolbar({
  entries,
  filtered,
  counts,
  level,
  onLevelChange,
  search,
  onSearchChange,
  grouped,
  onGroupedChange,
  onRefresh,
  onClear,
  channelLabel,
}: ErrorLogToolbarProps) {
  // Clearing a channel destroys evidence other people may still need, so it is
  // a separate capability from being able to read the log.
  const canManage = usePermission('diagnostics:manage');

  return (
    <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }} alignItems="center">
      <Chip label={`total ${String(entries.length)}`} />
      <Chip color="error" variant="outlined" label={`error ${String(counts.error ?? 0)}`} />
      <Chip color="warning" variant="outlined" label={`warning ${String(counts.warning ?? 0)}`} />
      <Chip color="info" variant="outlined" label={`info ${String(counts.info ?? 0)}`} />

      <TextField
        size="small"
        label="Search"
        placeholder="message, file, endpoint"
        value={search}
        onChange={(event) => {
          onSearchChange(event.target.value);
        }}
        sx={{ minWidth: 220 }}
      />

      <FormControl size="small" sx={{ minWidth: 130 }}>
        <InputLabel id={`level-filter-${channelLabel}`}>Level</InputLabel>
        <Select
          labelId={`level-filter-${channelLabel}`}
          label="Level"
          value={level}
          onChange={(event) => {
            onLevelChange(event.target.value);
          }}
        >
          <MenuItem value="all">All</MenuItem>
          <MenuItem value="error">Error</MenuItem>
          <MenuItem value="warning">Warning</MenuItem>
          <MenuItem value="info">Info</MenuItem>
          <MenuItem value="debug">Debug</MenuItem>
        </Select>
      </FormControl>

      <FormControlLabel
        control={
          <Switch
            size="small"
            checked={grouped}
            onChange={(event) => {
              onGroupedChange(event.target.checked);
            }}
          />
        }
        label="Group"
      />

      <Box sx={{ flexGrow: 1 }} />

      <Button startIcon={<RefreshIcon />} onClick={onRefresh}>
        Refresh
      </Button>
      <Button
        startIcon={<DownloadIcon />}
        variant="outlined"
        onClick={() => {
          downloadLogs('log', filtered);
        }}
        disabled={filtered.length === 0}
      >
        .log
      </Button>
      <Button
        startIcon={<DownloadIcon />}
        variant="outlined"
        onClick={() => {
          downloadLogs('json', filtered);
        }}
        disabled={filtered.length === 0}
      >
        .json
      </Button>
      {canManage && (
        <Button
          startIcon={<DeleteSweepIcon />}
          color="error"
          variant="outlined"
          onClick={onClear}
          disabled={entries.length === 0}
        >
          Clear {channelLabel}
        </Button>
      )}
    </Stack>
  );
}
