import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

import { fieldError, useAction } from '../../../foundation';

export interface Place {
  code: string;
  label: string;
}

export interface SearchCriteria {
  tripType: 'oneWay' | 'return';
  from?: string;
  to?: string;
  departOn: string;
  returnOn?: string;
  travellers: number;
  cabin: 'economy' | 'premium' | 'business';
}

export interface SearchWidgetProps {
  places: Place[];
  initial?: Partial<SearchCriteria>;
  recentSearches?: string[];
  onSearch: (criteria: SearchCriteria) => Promise<void>;
}

/**
 * The search form.
 *
 * Validation lives in the Action and comes back as `fieldErrors`, so "Return
 * date is before departure" appears under the return date rather than in a
 * toast that vanishes while the user is looking at the calendar.
 *
 * The swap button exists because "wrong way round" is the most common mistake
 * in a from/to pair, and re-typing two airports to fix it is the most common
 * annoyance.
 */
export function SearchWidget({ places, initial, recentSearches, onSearch }: SearchWidgetProps) {
  const [criteria, setCriteria] = useState<SearchCriteria>({
    tripType: 'return',
    departOn: '',
    travellers: 1,
    cabin: 'economy',
    ...initial,
  });

  const [result, search, pending] = useAction<void, 'searched'>(async () => {
    const errors: Record<string, string> = {};
    if (!criteria.from) errors.from = 'Choose where you are flying from.';
    if (!criteria.to) errors.to = 'Choose where you are flying to.';
    if (criteria.from && criteria.from === criteria.to) {
      errors.to = 'Origin and destination are the same.';
    }
    if (criteria.departOn === '') errors.departOn = 'Choose a departure date.';
    if (
      criteria.tripType === 'return' &&
      criteria.returnOn !== undefined &&
      criteria.returnOn !== '' &&
      criteria.returnOn < criteria.departOn
    ) {
      errors.returnOn = 'Return date is before departure.';
    }

    if (Object.keys(errors).length > 0) {
      return { status: 'error', message: 'Check the highlighted fields.', fieldErrors: errors };
    }

    await onSearch(criteria);
    return 'searched';
  });

  const set = <K extends keyof SearchCriteria>(key: K, value: SearchCriteria[K]) => {
    setCriteria((current) => ({ ...current, [key]: value }));
  };

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={2}>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={criteria.tripType}
          aria-label="Trip type"
          onChange={(_event, next: SearchCriteria['tripType'] | null) => {
            if (next) set('tripType', next);
          }}
        >
          <ToggleButton value="return">Return</ToggleButton>
          <ToggleButton value="oneWay">One way</ToggleButton>
        </ToggleButtonGroup>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="flex-start">
          <TextField
            select
            fullWidth
            size="small"
            label="From"
            value={criteria.from ?? ''}
            error={fieldError(result, 'from') !== undefined}
            helperText={fieldError(result, 'from')}
            onChange={(event) => {
              set('from', event.target.value);
            }}
          >
            {places.map((place) => (
              <MenuItem key={place.code} value={place.code}>
                {`${place.label} (${place.code})`}
              </MenuItem>
            ))}
          </TextField>

          {/* "Wrong way round" is the most common mistake in a from/to pair. */}
          <IconButton
            aria-label="Swap origin and destination"
            sx={{ mt: { sm: 0.5 } }}
            onClick={() => {
              setCriteria((current) => ({ ...current, from: current.to, to: current.from }));
            }}
          >
            <SwapHorizIcon />
          </IconButton>

          <TextField
            select
            fullWidth
            size="small"
            label="To"
            value={criteria.to ?? ''}
            error={fieldError(result, 'to') !== undefined}
            helperText={fieldError(result, 'to')}
            onChange={(event) => {
              set('to', event.target.value);
            }}
          >
            {places.map((place) => (
              <MenuItem key={place.code} value={place.code}>
                {`${place.label} (${place.code})`}
              </MenuItem>
            ))}
          </TextField>
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <TextField
            fullWidth
            size="small"
            type="date"
            label="Depart"
            value={criteria.departOn}
            error={fieldError(result, 'departOn') !== undefined}
            helperText={fieldError(result, 'departOn')}
            slotProps={{ inputLabel: { shrink: true } }}
            onChange={(event) => {
              set('departOn', event.target.value);
            }}
          />
          <TextField
            fullWidth
            size="small"
            type="date"
            label="Return"
            disabled={criteria.tripType === 'oneWay'}
            value={criteria.returnOn ?? ''}
            error={fieldError(result, 'returnOn') !== undefined}
            helperText={fieldError(result, 'returnOn')}
            slotProps={{ inputLabel: { shrink: true } }}
            onChange={(event) => {
              set('returnOn', event.target.value);
            }}
          />
          <TextField
            fullWidth
            size="small"
            type="number"
            label="Travellers"
            value={criteria.travellers}
            slotProps={{ htmlInput: { min: 1, max: 9 } }}
            onChange={(event) => {
              set('travellers', Number(event.target.value));
            }}
          />
          <TextField
            select
            fullWidth
            size="small"
            label="Cabin"
            value={criteria.cabin}
            onChange={(event) => {
              set('cabin', event.target.value as SearchCriteria['cabin']);
            }}
          >
            <MenuItem value="economy">Economy</MenuItem>
            <MenuItem value="premium">Premium economy</MenuItem>
            <MenuItem value="business">Business</MenuItem>
          </TextField>
        </Stack>

        {result.status === 'error' ? (
          <Alert severity="error" role="alert">
            {result.message}
          </Alert>
        ) : null}

        {recentSearches?.length ? (
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography variant="caption" color="text.secondary">
              Recent:
            </Typography>
            {recentSearches.map((entry) => (
              <Typography key={entry} variant="caption">
                {entry}
              </Typography>
            ))}
          </Stack>
        ) : null}

        <Button
          variant="contained"
          size="large"
          disabled={pending}
          onClick={() => {
            search();
          }}
        >
          {pending ? 'Searching…' : 'Search'}
        </Button>
      </Stack>
    </Paper>
  );
}
