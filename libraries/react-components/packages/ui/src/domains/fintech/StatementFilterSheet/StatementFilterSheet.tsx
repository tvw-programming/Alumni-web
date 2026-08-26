import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormLabel from '@mui/material/FormLabel';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { useState } from 'react';

export interface StatementFilters {
  range: '30d' | '90d' | 'year' | 'custom';
  from?: string;
  to?: string;
  direction: 'all' | 'debit' | 'credit';
  categories: string[];
}

export interface StatementFilterSheetProps {
  open: boolean;
  value: StatementFilters;
  availableCategories: string[];
  /** Result count for the pending selection, so Apply is not a guess. */
  matchCount?: number;
  onClose: () => void;
  onApply: (filters: StatementFilters) => void;
}

/**
 * Statement filters, applied as a batch.
 *
 * Draft state is local and only leaves on Apply. Live-applying each toggle
 * refetches four times while the user is still deciding, and on a statement
 * that is four full-table scans.
 *
 * `matchCount` is the reason the draft is worth having: showing "Apply · 42
 * results" turns a blind commit into an informed one.
 */
export function StatementFilterSheet({
  open,
  value,
  availableCategories,
  matchCount,
  onClose,
  onApply,
}: StatementFilterSheetProps) {
  const [draft, setDraft] = useState<StatementFilters>(value);

  const toggleCategory = (category: string) => {
    setDraft((current) => ({
      ...current,
      categories: current.categories.includes(category)
        ? current.categories.filter((entry) => entry !== category)
        : [...current.categories, category],
    }));
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Filter statement</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <Stack spacing={1}>
            <FormLabel id="range-label">Period</FormLabel>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={draft.range}
              aria-labelledby="range-label"
              onChange={(_event, next: StatementFilters['range'] | null) => {
                if (next) setDraft((current) => ({ ...current, range: next }));
              }}
            >
              <ToggleButton value="30d">30 days</ToggleButton>
              <ToggleButton value="90d">90 days</ToggleButton>
              <ToggleButton value="year">This year</ToggleButton>
              <ToggleButton value="custom">Custom</ToggleButton>
            </ToggleButtonGroup>
          </Stack>

          {draft.range === 'custom' ? (
            <Stack direction="row" spacing={1}>
              <TextField
                size="small"
                type="date"
                label="From"
                value={draft.from ?? ''}
                slotProps={{ inputLabel: { shrink: true } }}
                onChange={(event) => {
                  setDraft((current) => ({ ...current, from: event.target.value }));
                }}
              />
              <TextField
                size="small"
                type="date"
                label="To"
                value={draft.to ?? ''}
                slotProps={{ inputLabel: { shrink: true } }}
                onChange={(event) => {
                  setDraft((current) => ({ ...current, to: event.target.value }));
                }}
              />
            </Stack>
          ) : null}

          <Stack spacing={1}>
            <FormLabel id="direction-label">Direction</FormLabel>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={draft.direction}
              aria-labelledby="direction-label"
              onChange={(_event, next: StatementFilters['direction'] | null) => {
                if (next) setDraft((current) => ({ ...current, direction: next }));
              }}
            >
              <ToggleButton value="all">All</ToggleButton>
              <ToggleButton value="debit">Money out</ToggleButton>
              <ToggleButton value="credit">Money in</ToggleButton>
            </ToggleButtonGroup>
          </Stack>

          <Stack spacing={1}>
            <FormLabel>Categories</FormLabel>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {availableCategories.map((category) => {
                const selected = draft.categories.includes(category);
                return (
                  <Chip
                    key={category}
                    label={category}
                    color={selected ? 'primary' : 'default'}
                    variant={selected ? 'filled' : 'outlined'}
                    aria-pressed={selected}
                    role="button"
                    onClick={() => {
                      toggleCategory(category);
                    }}
                  />
                );
              })}
            </Stack>
          </Stack>
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button
          onClick={() => {
            // "Clear" resets the draft, not the applied filters — nothing
            // changes on the statement until Apply.
            setDraft({ range: '30d', direction: 'all', categories: [] });
          }}
        >
          Clear
        </Button>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={() => {
            onApply(draft);
          }}
        >
          {matchCount === undefined ? 'Apply' : `Apply · ${String(matchCount)} results`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
