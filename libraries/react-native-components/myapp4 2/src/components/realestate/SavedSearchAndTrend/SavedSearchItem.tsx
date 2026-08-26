import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Badge, Chip, Icon, IconButton, Menu, Text, TouchableRipple } from 'react-native-paper';

import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { usePropertyTheme } from '../theme/realestateTokens';
import type { SavedSearch } from '../types/domain';

export interface SavedSearchItemProps extends StyleEscapeHatches {
  search: SavedSearch;
  onPress?: (search: SavedSearch) => void;
  onEdit?: (search: SavedSearch) => void;
  onTogglePause?: (search: SavedSearch) => void;
  onDelete?: (search: SavedSearch) => void;
}

/**
 * New-match count and alert state are always plain text and icon together —
 * "3 new matches" is never implied only by a coloured dot. Deleting always
 * routes through the menu, never a swipe-only gesture with no visible
 * confirmation.
 */
export const SavedSearchItem = ({ search, onPress, onEdit, onTogglePause, onDelete, style, containerStyle, testID }: SavedSearchItemProps) => {
  const theme = useAppTheme();
  const realestate = usePropertyTheme();
  const id = testID ?? `saved-search-${search.id}`;
  const [menuVisible, setMenuVisible] = useState(false);

  const alertsOn = search.alerts.newListings || search.alerts.priceChanges || search.alerts.statusChanges;

  const a11yLabel = `${search.name}, ${search.locationLabel}${search.resultCount != null ? `, ${search.resultCount} results` : ''}${search.newMatchCount ? `, ${search.newMatchCount} new matches` : ''}${
    search.paused ? ', alerts paused' : alertsOn ? ', alerts on' : ''
  }`;

  return (
    <TouchableRipple onPress={onPress ? () => onPress(search) : undefined} disabled={!onPress} accessibilityRole={onPress ? 'button' : 'text'} accessibilityLabel={a11yLabel} style={[containerStyle, style]} testID={id}>
      <View style={styles.row}>
        <View style={styles.flex}>
          <View style={styles.row}>
            <Text variant="bodyMedium" style={styles.flex} numberOfLines={1}>
              {search.name}
            </Text>
            {search.newMatchCount ? <Badge size={18}>{search.newMatchCount}</Badge> : null}
          </View>
          <Text variant="labelSmall" style={{ color: realestate.colors.onSurfaceVariant }} numberOfLines={1}>
            {search.locationLabel}
          </Text>
          <View style={styles.chipRow}>
            {search.filterSummary.slice(0, 3).map((f) => (
              <Chip key={f} compact mode="outlined" style={styles.chip} textStyle={styles.chipText}>
                {f}
              </Chip>
            ))}
          </View>
          <View style={styles.row}>
            <Icon source={search.paused ? 'bell-off-outline' : 'bell-outline'} size={12} color={search.paused ? realestate.colors.onSurfaceVariant : realestate.colors.success} />
            <Text variant="labelSmall" style={{ color: search.paused ? realestate.colors.onSurfaceVariant : realestate.colors.success, marginLeft: 4 }}>
              {search.paused ? 'Paused' : 'Alerts on'}
            </Text>
            {search.resultCount != null ? (
              <Text variant="labelSmall" style={{ color: realestate.colors.onSurfaceVariant, marginLeft: 8 }}>
                {search.resultCount} results
              </Text>
            ) : null}
          </View>
        </View>

        {(onEdit || onTogglePause || onDelete) ? (
          <Menu
            visible={menuVisible}
            onDismiss={() => setMenuVisible(false)}
            anchor={<IconButton icon="dots-vertical" size={16} onPress={() => setMenuVisible(true)} accessibilityLabel={`More options for ${search.name}`} style={styles.noMargin} testID={childTestID(id, 'menu')} />}
          >
            {onEdit ? <Menu.Item onPress={() => { setMenuVisible(false); onEdit(search); }} title="Edit search" leadingIcon="pencil-outline" /> : null}
            {onTogglePause ? <Menu.Item onPress={() => { setMenuVisible(false); onTogglePause(search); }} title={search.paused ? 'Resume alerts' : 'Pause alerts'} leadingIcon={search.paused ? 'bell-outline' : 'bell-off-outline'} /> : null}
            {onDelete ? <Menu.Item onPress={() => { setMenuVisible(false); onDelete(search); }} title="Delete search" leadingIcon="delete-outline" /> : null}
          </Menu>
        ) : null}
      </View>
    </TouchableRipple>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  flex: { flex: 1 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  chip: { height: 24 },
  chipText: { fontSize: 10, marginVertical: 0, lineHeight: 12 },
  noMargin: { margin: 0 },
});
