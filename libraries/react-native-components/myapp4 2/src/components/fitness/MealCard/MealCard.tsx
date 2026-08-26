import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, IconButton, List, Menu, Text, TouchableRipple } from 'react-native-paper';

import { AppButton } from '@ui/atoms/AppButton';
import { AppCard } from '@ui/molecules/AppCard';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useWellnessTheme } from '../theme/fitnessTokens';
import type { Meal } from '../types/domain';
import { MacroBreakdownBar } from './MacroBreakdownBar';

export interface MealCardProps extends StyleEscapeHatches {
  meal: Meal;
  onAddFood: (meal: Meal) => void;
  onPress?: (meal: Meal) => void;
  onEdit?: (meal: Meal) => void;
  onDuplicate?: (meal: Meal) => void;
}

/**
 * Calorie and macro numbers always come from the nutrition service — this
 * card only renders `meal.calories` and `meal.macros` as given, it never
 * derives one from the other.
 */
export const MealCard = ({ meal, onAddFood, onPress, onEdit, onDuplicate, style, containerStyle, testID }: MealCardProps) => {
  const theme = useAppTheme();
  const wellness = useWellnessTheme();
  const id = testID ?? `meal-${meal.id}`;
  const [menuVisible, setMenuVisible] = useState(false);
  const empty = meal.state === 'empty' || meal.items.length === 0;

  if (meal.state === 'loading') {
    return (
      <AppCard variant="outlined" containerStyle={containerStyle} style={style} testID={childTestID(id, 'loading')}>
        <View style={styles.row}>
          <ActivityIndicator size={18} />
          <Text variant="bodyMedium" style={{ marginLeft: 8, color: wellness.colors.onSurfaceVariant }}>
            Loading {meal.mealName.toLowerCase()}…
          </Text>
        </View>
      </AppCard>
    );
  }

  return (
    <AppCard variant="outlined" containerStyle={containerStyle} style={style} testID={id}>
      <TouchableRipple onPress={onPress ? () => onPress(meal) : undefined} disabled={!onPress} accessibilityRole={onPress ? 'button' : undefined}>
        <View style={{ gap: theme.spacing.sm }}>
          <View style={styles.row}>
            <View style={styles.flex}>
              <Text variant="titleSmall">{meal.mealName}</Text>
              {meal.timeLabel ? (
                <Text variant="labelSmall" style={{ color: wellness.colors.onSurfaceVariant }}>
                  {meal.timeLabel}
                </Text>
              ) : null}
            </View>
            {meal.calories != null ? (
              <Text variant="titleSmall">{meal.calories.toLocaleString()} kcal</Text>
            ) : (
              <Text variant="labelSmall" style={{ color: wellness.colors.onSurfaceVariant }}>
                Calories unavailable
              </Text>
            )}
            {(onEdit || onDuplicate) ? (
              <Menu
                visible={menuVisible}
                onDismiss={() => setMenuVisible(false)}
                anchor={<IconButton icon="dots-vertical" size={16} onPress={() => setMenuVisible(true)} accessibilityLabel={`More options for ${meal.mealName}`} style={styles.noMargin} />}
              >
                {onEdit ? <Menu.Item onPress={() => { setMenuVisible(false); onEdit(meal); }} title="Edit meal" leadingIcon="pencil-outline" /> : null}
                {onDuplicate ? <Menu.Item onPress={() => { setMenuVisible(false); onDuplicate(meal); }} title="Duplicate meal" leadingIcon="content-copy" /> : null}
              </Menu>
            ) : null}
          </View>

          {meal.state === 'error' ? (
            <Text variant="labelSmall" style={{ color: wellness.colors.error }}>
              We couldn't load this meal's nutrition data.
            </Text>
          ) : empty ? (
            <Text variant="bodySmall" style={{ color: wellness.colors.onSurfaceVariant }}>
              No food logged for {meal.mealName.toLowerCase()} yet.
            </Text>
          ) : (
            <>
              {meal.items.slice(0, 3).map((item) => (
                <List.Item
                  key={item.id}
                  title={item.name}
                  description={item.servingLabel}
                  right={() => (item.calories != null ? <Text variant="labelSmall">{item.calories} kcal</Text> : null)}
                  style={styles.listItem}
                  titleStyle={{ fontSize: 14 }}
                />
              ))}
              {meal.items.length > 3 ? (
                <Text variant="labelSmall" style={{ color: wellness.colors.onSurfaceVariant }}>
                  +{meal.items.length - 3} more item{meal.items.length - 3 === 1 ? '' : 's'}
                </Text>
              ) : null}
              {meal.macros.length > 0 ? <MacroBreakdownBar macros={meal.macros} /> : null}
            </>
          )}

          <AppButton variant="secondary" size="sm" onPress={() => onAddFood(meal)} testID={childTestID(id, 'add-food')}>
            Add food
          </AppButton>
        </View>
      </TouchableRipple>
    </AppCard>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  listItem: { paddingHorizontal: 0, minHeight: 40 },
  noMargin: { margin: 0 },
});
