/**
 * USAGE — ComparePropertiesTable
 *
 * "Lakeview Villa"'s missing Parking data reads "Not provided," not "No" —
 * absence of data is never presented as proof the amenity doesn't exist.
 */
import React, { useState } from 'react';
import { ScrollView } from 'react-native';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { CompareRow, PropertySummary } from '../types/domain';
import { ComparePropertiesTable } from './ComparePropertiesTable';
import sample from './ComparePropertiesTable.sample.json';

const initial = loadSample<{ properties: PropertySummary[]; rows: CompareRow[] }>(sample);

export const ComparePropertiesTableUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const [properties, setProperties] = useState(initial.properties);

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md }}>
      <ComparePropertiesTable
        properties={properties}
        rows={initial.rows}
        onRemove={(propertyId) => {
          setProperties((prev) => prev.filter((p) => p.id !== propertyId));
          toast.show('Removed from comparison');
        }}
        onAddProperty={() => toast.show('Opening property search to add to comparison')}
      />
    </ScrollView>
  );
};
