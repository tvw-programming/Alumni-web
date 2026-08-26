import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, IconButton, Text, TouchableRipple } from 'react-native-paper';

import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import type { SavedPlace, SavedPlaceLabel } from '../types/domain';

const LABEL_ICON: Record<SavedPlaceLabel, string> = {
  home: 'home-outline',
  work: 'briefcase-outline',
  airport: 'airplane',
  other: 'map-marker-outline',
  custom: 'star-outline',
};

const LABEL_COPY: Record<SavedPlaceLabel, string> = {
  home: 'Home',
  work: 'Work',
  airport: 'Airport',
  other: 'Other',
  custom: 'Custom place',
};

export interface SavedPlaceItemProps extends StyleEscapeHatches {
  place: SavedPlace;
  compact?: boolean;
  selected?: boolean;
  showEdit?: boolean;
  showDelete?: boolean;
  loading?: boolean;
  deleting?: boolean;
  invalid?: boolean;
  onSelect?: (place: SavedPlace) => void;
  onEdit?: (place: SavedPlace) => void;
  onDelete?: (place: SavedPlace) => void;
}

/**
 * The whole row selects the place; edit and delete are separate tap targets
 * so a rider reaching for "use this location" can never trigger a delete by
 * mistake. Deleting always confirms in place before calling `onDelete`.
 */
export const SavedPlaceItem = ({
  place,
  compact = false,
  selected = false,
  showEdit = true,
  showDelete = true,
  loading = false,
  deleting = false,
  invalid = false,
  onSelect,
  onEdit,
  onDelete,
  style,
  containerStyle,
  testID,
}: SavedPlaceItemProps) => {
  const theme = useAppTheme();
  const id = testID ?? `saved-place-${place.id}`;
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const label = place.label === 'custom' ? (place.customLabel ?? 'Custom place') : LABEL_COPY[place.label];

  return (
    <View style={[containerStyle, style]} testID={id}>
      <TouchableRipple
        onPress={onSelect ? () => onSelect(place) : undefined}
        disabled={!onSelect || loading || deleting}
        accessibilityRole={onSelect ? 'button' : 'text'}
        accessibilityState={{ selected, disabled: loading || deleting }}
        accessibilityLabel={`${label}, ${place.address}${place.isDefault ? ', default' : ''}${invalid ? ', address needs review' : ''}`}
      >
        <View style={[styles.row, { paddingVertical: compact ? 6 : 10, opacity: deleting ? 0.5 : 1 }]}>
          <Icon source={LABEL_ICON[place.label]} size={20} color={selected ? theme.colors.primary : theme.colors.onSurfaceVariant} />
          <View style={[styles.flex, { marginLeft: 12 }]}>
            <View style={styles.row}>
              <Text variant="bodyLarge" style={{ color: selected ? theme.colors.primary : theme.colors.onSurface }}>
                {label}
              </Text>
              {place.isDefault ? (
                <View style={[styles.badge, { backgroundColor: theme.colors.surfaceVariant, borderRadius: theme.radii.pill }]}>
                  <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    Default
                  </Text>
                </View>
              ) : null}
            </View>
            {!compact ? (
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
                {place.address}
              </Text>
            ) : null}
            {invalid ? (
              <Text variant="labelSmall" style={{ color: theme.colors.error }}>
                This address may no longer be serviceable.
              </Text>
            ) : null}
          </View>

          {showEdit && onEdit ? (
            <IconButton icon="pencil-outline" size={18} onPress={() => onEdit(place)} accessibilityLabel={`Edit ${label}`} testID={childTestID(id, 'edit')} />
          ) : null}
          {showDelete && onDelete ? (
            <IconButton
              icon="delete-outline"
              size={18}
              onPress={() => setConfirmingDelete(true)}
              accessibilityLabel={`Remove ${label}`}
              testID={childTestID(id, 'delete')}
            />
          ) : null}
        </View>
      </TouchableRipple>

      {confirmingDelete ? (
        <View style={[styles.confirmRow, { backgroundColor: theme.colors.errorContainer, borderRadius: theme.radii.sm, padding: 10 }]}>
          <Text variant="labelSmall" style={{ color: theme.colors.onErrorContainer, flex: 1 }}>
            Remove "{label}"?
          </Text>
          <Text
            variant="labelSmall"
            onPress={() => {
              setConfirmingDelete(false);
              onDelete?.(place);
            }}
            accessibilityRole="button"
            style={{ color: theme.colors.onErrorContainer, fontWeight: '700', marginRight: 16 }}
            testID={childTestID(id, 'confirm-delete')}
          >
            Remove
          </Text>
          <Text
            variant="labelSmall"
            onPress={() => setConfirmingDelete(false)}
            accessibilityRole="button"
            style={{ color: theme.colors.onErrorContainer }}
          >
            Cancel
          </Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  badge: { paddingHorizontal: 6, paddingVertical: 1, marginLeft: 6 },
  confirmRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
});
