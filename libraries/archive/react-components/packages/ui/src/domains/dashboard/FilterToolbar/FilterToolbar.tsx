import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useDeferredValue } from 'react';

export interface FilterDefinition {
  id: string;
  label: string;
  options: { value: string; label: string }[];
}

export interface FilterToolbarProps {
  search: string;
  filters: FilterDefinition[];
  values: Record<string, string | undefined>;
  resultCount?: number;
  onSearchChange: (value: string) => void;
  onFilterChange: (id: string, value: string | undefined) => void;
  onClearAll?: () => void;
}

/**
 * Search plus dropdown filters, with the active ones shown as removable chips.
 *
 * The chips are the point. A filter hidden inside a collapsed dropdown is a
 * filter the user forgets they set, and then reports the empty table as a bug.
 * Every active filter is visible and removable in one click.
 *
 * `useDeferredValue` on the search term keeps typing responsive: the input
 * updates immediately and the (expensive) filtered render lags by a frame
 * instead of blocking each keystroke.
 */
export function FilterToolbar({
  search,
  filters,
  values,
  resultCount,
  onSearchChange,
  onFilterChange,
  onClearAll,
}: FilterToolbarProps) {
  const deferredSearch = useDeferredValue(search);
  const stale = deferredSearch !== search;

  const active = filters
    .map((filter) => ({ filter, value: values[filter.id] }))
    .filter(
      (entry): entry is { filter: FilterDefinition; value: string } => entry.value !== undefined,
    );

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
        <TextField
          size="small"
          placeholder="Search"
          value={search}
          onChange={(event) => {
            onSearchChange(event.target.value);
          }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
          sx={{ minWidth: 220, opacity: stale ? 0.7 : 1 }}
        />

        {filters.map((filter) => (
          <TextField
            key={filter.id}
            select
            size="small"
            label={filter.label}
            value={values[filter.id] ?? ''}
            onChange={(event) => {
              onFilterChange(filter.id, event.target.value === '' ? undefined : event.target.value);
            }}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="">Any</MenuItem>
            {filter.options.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        ))}

        <Box sx={{ flexGrow: 1 }} />

        {resultCount !== undefined ? (
          // Announced, so a screen-reader user learns the filter did something.
          <Typography variant="body2" color="text.secondary" role="status">
            {`${String(resultCount)} result${resultCount === 1 ? '' : 's'}`}
          </Typography>
        ) : null}
      </Stack>

      {active.length > 0 ? (
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
          {active.map(({ filter, value }) => {
            const option = filter.options.find((entry) => entry.value === value);
            return (
              <Chip
                key={filter.id}
                size="small"
                label={`${filter.label}: ${option?.label ?? value}`}
                deleteIcon={<CloseIcon />}
                onDelete={() => {
                  onFilterChange(filter.id, undefined);
                }}
                // The delete target needs its own label; "Chip" is not one.
                aria-label={`Remove filter ${filter.label} ${option?.label ?? value}`}
              />
            );
          })}
          {onClearAll ? (
            <Button size="small" onClick={onClearAll}>
              Clear all
            </Button>
          ) : null}
        </Stack>
      ) : null}
    </Stack>
  );
}
