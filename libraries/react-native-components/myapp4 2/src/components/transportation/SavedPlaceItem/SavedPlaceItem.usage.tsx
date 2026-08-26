/**
 * USAGE — SavedPlaceItem
 *
 * Deleting always shows an inline "Remove / Cancel" confirmation before
 * calling `onDelete` — never a single-tap destructive action.
 */
import React, { useState } from 'react';
import { ScrollView } from 'react-native';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { SavedPlace } from '../types/domain';
import { SavedPlaceItem } from './SavedPlaceItem';
import sample from './SavedPlaceItem.sample.json';

const { places: initialPlaces } = loadSample<{ places: SavedPlace[] }>(sample);

export const SavedPlaceItemUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const [places, setPlaces] = useState(initialPlaces);

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md }}>
      {places.map((place) => (
        <SavedPlaceItem
          key={place.id}
          place={place}
          onSelect={(item) => toast.show(`Using ${item.address}`)}
          onEdit={(item) => toast.show(`Editing ${item.label === 'custom' ? item.customLabel : item.label}`)}
          onDelete={(item) => {
            setPlaces((prev) => prev.filter((p) => p.id !== item.id));
            toast.success('Saved place removed');
          }}
        />
      ))}
    </ScrollView>
  );
};
