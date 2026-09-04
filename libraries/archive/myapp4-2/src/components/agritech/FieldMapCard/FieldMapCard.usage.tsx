import React from 'react';
import { ScrollView, View } from 'react-native';

import { useAppTheme } from '@/theme';

import { FieldMapCard } from './FieldMapCard';
import sample from './FieldMapCard.sample.json';
import { loadSample } from '../types/sample';
import type { Field } from '../types/domain';

const FIELDS = loadSample<{ fields: Field[] }>(sample).fields;

export const FieldMapCardUsage = () => {
  const theme = useAppTheme();

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.sm }}>
      {FIELDS.map((field) => (
        <View key={field.id}>
          <FieldMapCard field={field} onPress={() => {}} onEditBoundary={() => {}} />
        </View>
      ))}
    </ScrollView>
  );
};
