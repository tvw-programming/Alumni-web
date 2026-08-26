import { useState } from 'react';

import { FilterToolbar } from './FilterToolbar';
import sample from './sample.json';

export function FilterToolbarUsage() {
  const [search, setSearch] = useState(sample.search);
  const [values, setValues] = useState<Record<string, string | undefined>>(sample.values);

  return (
    <FilterToolbar
      search={search}
      filters={sample.filters}
      values={values}
      resultCount={sample.resultCount}
      onSearchChange={setSearch}
      // In a real app these go into the URL, so a filtered view is shareable
      // and survives a reload.
      onFilterChange={(id, value) => {
        setValues((current) => ({ ...current, [id]: value }));
      }}
      onClearAll={() => {
        setValues({});
        setSearch('');
      }}
    />
  );
}
