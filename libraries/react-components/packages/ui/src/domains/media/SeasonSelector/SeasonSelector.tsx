import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { pluralize } from '../../../foundation';

export interface Season {
  id: string;
  label: string;
  episodeCount: number;
  year?: number;
  /** Set when the whole season is unavailable on this plan or region. */
  unavailableReason?: string;
}

export interface SeasonSelectorProps {
  seasons: Season[];
  selectedId: string;
  onChange: (seasonId: string) => void;
}

/**
 * Season picker.
 *
 * A `<select>`, not a row of tabs. Shows with eighteen seasons overflow a tab
 * strip, and the horizontal scroll that results is the worst way to choose one
 * item from many.
 *
 * Each option carries its episode count and year, because "Season 3" alone does
 * not help someone deciding where they left off two years ago.
 */
export function SeasonSelector({ seasons, selectedId, onChange }: SeasonSelectorProps) {
  const selected = seasons.find((season) => season.id === selectedId);

  return (
    <Stack direction="row" spacing={2} alignItems="center">
      <TextField
        select
        size="small"
        label="Season"
        value={selectedId}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        sx={{ minWidth: 200 }}
      >
        {seasons.map((season) => (
          <MenuItem
            key={season.id}
            value={season.id}
            disabled={season.unavailableReason !== undefined}
          >
            {`${season.label} · ${pluralize(season.episodeCount, 'episode')}${
              season.year ? ` · ${String(season.year)}` : ''
            }`}
          </MenuItem>
        ))}
      </TextField>

      {selected ? (
        <Typography variant="caption" color="text.secondary" role="status">
          {selected.unavailableReason ?? pluralize(selected.episodeCount, 'episode')}
        </Typography>
      ) : null}
    </Stack>
  );
}
