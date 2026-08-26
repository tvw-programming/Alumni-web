import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, IconButton, Text, TextInput } from 'react-native-paper';

import { useControllableState } from '@/hooks';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import type { GuestRoomSelection, OccupancyRules } from '../types/domain';

export interface GuestRoomSelectorProps extends StyleEscapeHatches {
  value?: GuestRoomSelection;
  defaultValue?: GuestRoomSelection;
  onChange?: (next: GuestRoomSelection) => void;
  rules?: OccupancyRules;
  showPets?: boolean;
}

const DEFAULT_RULES: OccupancyRules = {
  minAdults: 1,
  maxAdults: 16,
  maxChildren: 8,
  maxRooms: 8,
  requireChildAges: true,
};

const DEFAULT_VALUE: GuestRoomSelection = { adults: 2, children: 0, rooms: 1, childAges: [] };

/**
 * Grouped steppers for adults, children, rooms (and optional pets), used both
 * standalone and inside `SearchWidget`'s traveler field.
 *
 * Occupancy is never silently corrected — if a room count would need to grow
 * to fit the party, `OccupancyWarning` says so and asks, it never adds a room
 * on the caller's behalf.
 */
export const GuestRoomSelector = ({
  value,
  defaultValue = DEFAULT_VALUE,
  onChange,
  rules = DEFAULT_RULES,
  showPets = false,
  style,
  containerStyle,
  testID,
}: GuestRoomSelectorProps) => {
  const theme = useAppTheme();
  const id = testID ?? 'guest-room-selector';
  const [selection, setSelection] = useControllableState<GuestRoomSelection>({ value, defaultValue, onChange });

  const totalGuestsPerRoom = useMemo(
    () => (selection.adults + selection.children) / Math.max(1, selection.rooms),
    [selection],
  );
  const overCapacity = !!rules.maxGuestsPerRoom && totalGuestsPerRoom > rules.maxGuestsPerRoom;

  const update = useCallback(
    (patch: Partial<GuestRoomSelection>) => setSelection((prev) => ({ ...prev, ...patch })),
    [setSelection],
  );

  const setAdults = (delta: number) =>
    update({ adults: Math.max(rules.minAdults, Math.min(rules.maxAdults, selection.adults + delta)) });

  const setChildren = (delta: number) => {
    const next = Math.max(0, Math.min(rules.maxChildren, selection.children + delta));
    const ages = selection.childAges ? [...selection.childAges] : [];
    if (delta > 0) ages.push(null);
    else if (delta < 0) ages.pop();
    update({ children: next, childAges: ages });
  };

  const setRooms = (delta: number) => update({ rooms: Math.max(1, Math.min(rules.maxRooms, selection.rooms + delta)) });

  const setPets = (delta: number) => update({ pets: Math.max(0, (selection.pets ?? 0) + delta) });

  const setChildAge = (index: number, age: number) => {
    const ages = selection.childAges ? [...selection.childAges] : [];
    ages[index] = age;
    update({ childAges: ages });
  };

  return (
    <View style={[{ gap: theme.spacing.md }, containerStyle, style]} testID={id}>
      <StepperRow
        label="Adults"
        value={selection.adults}
        onDecrement={() => setAdults(-1)}
        onIncrement={() => setAdults(1)}
        canDecrement={selection.adults > rules.minAdults}
        canIncrement={selection.adults < rules.maxAdults}
        testID={childTestID(id, 'adults')}
      />
      <StepperRow
        label="Children"
        helper="Ages 0–17"
        value={selection.children}
        onDecrement={() => setChildren(-1)}
        onIncrement={() => setChildren(1)}
        canDecrement={selection.children > 0}
        canIncrement={selection.children < rules.maxChildren}
        testID={childTestID(id, 'children')}
      />

      {rules.requireChildAges && selection.children > 0 ? (
        <View style={{ gap: theme.spacing.xs }}>
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            Add the age of each child
          </Text>
          <View style={styles.ageRow}>
            {Array.from({ length: selection.children }).map((_, index) => (
              <TextInput
                key={index}
                mode="outlined"
                dense
                keyboardType="number-pad"
                placeholder={`Child ${index + 1}`}
                value={selection.childAges?.[index] != null ? String(selection.childAges[index]) : ''}
                onChangeText={(text) => {
                  const age = Number(text.replace(/[^0-9]/g, ''));
                  if (!Number.isNaN(age)) setChildAge(index, Math.min(17, age));
                }}
                style={styles.ageInput}
                accessibilityLabel={`Age of child ${index + 1}, 0 to 17`}
                testID={childTestID(id, `child-age-${index}`)}
              />
            ))}
          </View>
        </View>
      ) : null}

      <StepperRow
        label="Rooms"
        value={selection.rooms}
        onDecrement={() => setRooms(-1)}
        onIncrement={() => setRooms(1)}
        canDecrement={selection.rooms > 1}
        canIncrement={selection.rooms < rules.maxRooms}
        testID={childTestID(id, 'rooms')}
      />

      {showPets ? (
        <StepperRow
          label="Pets"
          value={selection.pets ?? 0}
          onDecrement={() => setPets(-1)}
          onIncrement={() => setPets(1)}
          canDecrement={(selection.pets ?? 0) > 0}
          canIncrement={(selection.pets ?? 0) < 8}
          testID={childTestID(id, 'pets')}
        />
      ) : null}

      {rules.maxGuestsPerRoom ? (
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
          Each room can host up to {rules.maxGuestsPerRoom} guests
        </Text>
      ) : null}

      {overCapacity ? (
        <View
          style={[styles.warning, { backgroundColor: theme.colors.errorContainer, borderRadius: theme.radii.sm, padding: theme.spacing.sm }]}
          accessibilityLiveRegion="polite"
          testID={childTestID(id, 'occupancy-warning')}
        >
          <Icon source="alert-circle-outline" size={15} color={theme.colors.onErrorContainer} />
          <Text variant="labelSmall" style={{ color: theme.colors.onErrorContainer, marginLeft: 6, flex: 1 }}>
            This is more guests than a room usually holds. Consider adding another room.
          </Text>
        </View>
      ) : null}
    </View>
  );
};

const StepperRow = ({
  label,
  helper,
  value,
  onDecrement,
  onIncrement,
  canDecrement,
  canIncrement,
  testID,
}: {
  label: string;
  helper?: string;
  value: number;
  onDecrement: () => void;
  onIncrement: () => void;
  canDecrement: boolean;
  canIncrement: boolean;
  testID?: string;
}) => {
  const theme = useAppTheme();
  return (
    <View style={styles.row} testID={testID}>
      <View style={styles.flex}>
        <Text variant="bodyLarge">{label}</Text>
        {helper ? (
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {helper}
          </Text>
        ) : null}
      </View>
      <View style={styles.controls}>
        <IconButton
          icon="minus"
          mode="outlined"
          size={18}
          disabled={!canDecrement}
          onPress={onDecrement}
          accessibilityLabel={`Decrease ${label.toLowerCase()}`}
          testID={childTestID(testID, 'decrement')}
        />
        <Text variant="titleMedium" style={styles.value} accessibilityLiveRegion="polite">
          {value}
        </Text>
        <IconButton
          icon="plus"
          mode="outlined"
          size={18}
          disabled={!canIncrement}
          onPress={onIncrement}
          accessibilityLabel={`Increase ${label.toLowerCase()}`}
          testID={childTestID(testID, 'increment')}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  value: { width: 28, textAlign: 'center' },
  ageRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  ageInput: { width: 96 },
  warning: { flexDirection: 'row', alignItems: 'center' },
});
