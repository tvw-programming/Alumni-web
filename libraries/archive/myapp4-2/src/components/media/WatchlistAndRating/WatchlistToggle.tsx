import React from 'react';
import { ActivityIndicator, IconButton, Text, TouchableRipple } from 'react-native-paper';
import { StyleSheet, View } from 'react-native';

import { useAppTheme } from '@/theme';
import type { StyleEscapeHatches } from '@ui/primitives';

export interface WatchlistToggleProps extends StyleEscapeHatches {
  title: string;
  saved: boolean;
  loading?: boolean;
  disabled?: boolean;
  showLabel?: boolean;
  onToggle: () => void;
}

/**
 * The icon fill communicates saved state, but the accessible name is always
 * the sentence that actually matters — "Add {title} to My List" / "Remove
 * {title} from My List" — never a bare "Toggle watchlist."
 */
export const WatchlistToggle = ({ title, saved, loading = false, disabled = false, showLabel = false, onToggle, style, containerStyle, testID }: WatchlistToggleProps) => {
  const theme = useAppTheme();
  const id = testID ?? 'watchlist-toggle';
  const a11yLabel = saved ? `Remove ${title} from My List` : `Add ${title} to My List`;

  if (showLabel) {
    return (
      <TouchableRipple
        onPress={onToggle}
        disabled={disabled || loading}
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
        accessibilityState={{ selected: saved, disabled: disabled || loading }}
        style={[containerStyle, style]}
        testID={id}
      >
        <View style={styles.row}>
          {loading ? (
            <ActivityIndicator size={16} />
          ) : (
            <IconButton icon={saved ? 'check' : 'plus'} size={16} onPress={onToggle} disabled={disabled} accessibilityElementsHidden style={styles.noMargin} />
          )}
          <Text variant="labelMedium" style={{ color: theme.colors.onSurface, marginLeft: 4 }}>
            {saved ? 'Added to My List' : 'Add to My List'}
          </Text>
        </View>
      </TouchableRipple>
    );
  }

  if (loading) {
    return (
      <View style={[styles.loadingWrap, containerStyle, style]} testID={id} accessibilityLabel="Updating watchlist">
        <ActivityIndicator size={18} />
      </View>
    );
  }

  return (
    <IconButton
      icon={saved ? 'bookmark' : 'bookmark-outline'}
      size={20}
      disabled={disabled}
      onPress={onToggle}
      accessibilityLabel={a11yLabel}
      accessibilityState={{ selected: saved, disabled }}
      containerColor="rgba(0,0,0,0.35)"
      iconColor="#FFFFFF"
      style={[containerStyle, style]}
      testID={id}
    />
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  noMargin: { margin: 0 },
  loadingWrap: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
});
