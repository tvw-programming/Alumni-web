import React, { useState } from 'react';
import { View } from 'react-native';
import { SegmentedButtons, Text, TextInput } from 'react-native-paper';

import { AppButton } from '@ui/atoms/AppButton';
import { AppSheet } from '@ui/organisms/AppSheet';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import type { WeightEntry, WeightUnit } from '../types/domain';

export interface LogEntrySheetProps extends StyleEscapeHatches {
  visible: boolean;
  unit?: WeightUnit;
  editingEntry?: WeightEntry;
  onDismiss: () => void;
  onSave: (value: number, unit: WeightUnit) => void;
  onDelete?: (entryId: string) => void;
}

/**
 * A manual entry only — device sync and import conflicts are resolved by the
 * weight-trend service before an entry ever reaches this sheet. Deleting an
 * entry is a distinct, separately-confirmed action, not a side effect of
 * editing.
 */
export const LogEntrySheet = ({ visible, unit = 'kg', editingEntry, onDismiss, onSave, onDelete, style, containerStyle, testID }: LogEntrySheetProps) => {
  const theme = useAppTheme();
  const id = testID ?? 'log-entry-sheet';
  const [value, setValue] = useState(editingEntry ? String(editingEntry.value) : '');
  const [selectedUnit, setSelectedUnit] = useState<WeightUnit>(editingEntry?.unit ?? unit);

  const numeric = Number(value);
  const valid = value.trim().length > 0 && !Number.isNaN(numeric) && numeric > 0;

  const handleSave = () => {
    if (!valid) return;
    onSave(numeric, selectedUnit);
    setValue('');
  };

  return (
    <AppSheet
      visible={visible}
      onDismiss={onDismiss}
      variant="bottom"
      title={editingEntry ? 'Edit weight' : 'Add weight'}
      scrollable={false}
      style={style}
      containerStyle={containerStyle}
      testID={id}
      footer={
        <View style={{ gap: theme.spacing.sm }}>
          <AppButton variant="primary" size="lg" fullWidth disabled={!valid} onPress={handleSave} testID={childTestID(id, 'save')}>
            Save
          </AppButton>
          {editingEntry && onDelete ? (
            <AppButton variant="ghost" size="md" fullWidth onPress={() => onDelete(editingEntry.id)} testID={childTestID(id, 'delete')}>
              Delete entry
            </AppButton>
          ) : null}
        </View>
      }
    >
      <View style={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
        <TextInput mode="outlined" label="Weight" keyboardType="decimal-pad" value={value} onChangeText={setValue} autoFocus testID={childTestID(id, 'value')} />
        <SegmentedButtons
          value={selectedUnit}
          onValueChange={(v) => setSelectedUnit(v as WeightUnit)}
          buttons={[
            { value: 'kg', label: 'kg' },
            { value: 'lb', label: 'lb' },
          ]}
        />
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
          Manual entries are recorded with today's date and time.
        </Text>
      </View>
    </AppSheet>
  );
};
