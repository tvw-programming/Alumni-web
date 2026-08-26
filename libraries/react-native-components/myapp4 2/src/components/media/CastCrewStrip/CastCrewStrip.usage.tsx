/**
 * USAGE — CastCrewStrip
 *
 * "Julian Marsh" has no photo and falls back to initials instead of a blank
 * circle — the name and character are still fully announced either way.
 */
import React from 'react';
import { ScrollView } from 'react-native';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { CastCrewPerson } from '../types/domain';
import { CastCrewStrip } from './CastCrewStrip';
import sample from './CastCrewStrip.sample.json';

const { people } = loadSample<{ people: CastCrewPerson[] }>(sample);

export const CastCrewStripUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, backgroundColor: '#0B0B0F' }}>
      <CastCrewStrip
        people={people}
        onPersonPress={(personId) => toast.show(`Opening profile for ${people.find((p) => p.id === personId)?.name}`)}
        onSeeAll={() => toast.show('Opening full cast and crew list')}
      />
    </ScrollView>
  );
};
