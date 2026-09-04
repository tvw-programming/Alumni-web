import Button from '@mui/material/Button';
import { useState } from 'react';

import sample from './sample.json';
import { StatementFilterSheet, type StatementFilters } from './StatementFilterSheet';

export function StatementFilterSheetUsage() {
  const [open, setOpen] = useState(true);
  const [filters, setFilters] = useState<StatementFilters>(sample.value as StatementFilters);

  return (
    <>
      <Button
        variant="outlined"
        onClick={() => {
          setOpen(true);
        }}
      >
        {`Filters · ${filters.range}, ${String(filters.categories.length)} categories`}
      </Button>
      <StatementFilterSheet
        open={open}
        value={filters}
        availableCategories={sample.availableCategories}
        matchCount={sample.matchCount}
        onClose={() => {
          setOpen(false);
        }}
        // Applied filters belong in the URL, so a filtered statement can be
        // shared and survives a reload.
        onApply={(next) => {
          setFilters(next);
          setOpen(false);
        }}
      />
    </>
  );
}
