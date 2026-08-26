/**
 * USAGE — MealCard + MacroBreakdownBar
 *
 * Lunch's protein bar goes past its bar length and is labelled "Over goal"
 * as text — the over-target state never relies on the bar overflowing
 * silently.
 */
import React from 'react';
import { ScrollView } from 'react-native';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { Meal } from '../types/domain';
import { MealCard } from './MealCard';
import sample from './MealCard.sample.json';

const { meals } = loadSample<{ meals: Meal[] }>(sample);

export const MealCardUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
      {meals.map((meal) => (
        <MealCard
          key={meal.id}
          meal={meal}
          onAddFood={(item) => toast.show(`Opening food search for ${item.mealName}`)}
          onPress={(item) => toast.show(`Opening ${item.mealName} detail`)}
          onEdit={(item) => toast.show(`Editing ${item.mealName}`)}
          onDuplicate={(item) => toast.success(`Duplicated ${item.mealName}`)}
        />
      ))}
    </ScrollView>
  );
};
