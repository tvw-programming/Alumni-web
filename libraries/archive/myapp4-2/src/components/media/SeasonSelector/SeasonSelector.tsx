import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Icon, Menu, SegmentedButtons, Text, TouchableRipple } from 'react-native-paper';

import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useStreamingTheme } from '../theme/mediaTokens';
import type { Season } from '../types/domain';

export interface SeasonSelectorProps extends StyleEscapeHatches {
  seasons: Season[];
  selectedSeasonId?: string;
  variant?: 'menu' | 'segmented';
  onChange: (seasonId: string) => void;
}

/**
 * One selection model, two renderers — `onChange` only ever emits a season
 * id. Episode fetching is the caller's job; this component never triggers a
 * network request itself.
 */
export const SeasonSelector = ({ seasons, selectedSeasonId, variant = 'segmented', onChange, style, containerStyle, testID }: SeasonSelectorProps) => {
  const id = testID ?? 'season-selector';

  if (seasons.length <= 1 && seasons[0]) {
    const only = seasons[0];
    return (
      <View style={[containerStyle, style]} testID={id}>
        <Text variant="titleSmall">
          {only.label}
          {only.episodeCount ? ` · ${only.episodeCount} episodes` : ''}
        </Text>
      </View>
    );
  }

  return variant === 'menu' ? (
    <SeasonMenu seasons={seasons} selectedSeasonId={selectedSeasonId} onChange={onChange} containerStyle={containerStyle} style={style} testID={id} />
  ) : (
    <SeasonSegmentedButtons seasons={seasons} selectedSeasonId={selectedSeasonId} onChange={onChange} containerStyle={containerStyle} style={style} testID={id} />
  );
};

const SeasonMenu = ({ seasons, selectedSeasonId, onChange, style, containerStyle, testID }: SeasonSelectorProps) => {
  const theme = useAppTheme();
  const media = useStreamingTheme();
  const [visible, setVisible] = useState(false);
  const selected = seasons.find((s) => s.id === selectedSeasonId) ?? seasons[0];

  return (
    <View style={[containerStyle, style]} testID={testID}>
      <Menu
        visible={visible}
        onDismiss={() => setVisible(false)}
        anchor={
          <TouchableRipple onPress={() => setVisible(true)} accessibilityRole="button" accessibilityLabel={`Choose a season, currently ${selected?.label}`} testID={childTestID(testID, 'trigger')}>
            <View style={styles.menuTrigger}>
              <Text variant="titleSmall">{selected?.label ?? 'Choose a season'}</Text>
              <Icon source="chevron-down" size={18} color={media.colors.onSurfaceVariant} />
            </View>
          </TouchableRipple>
        }
      >
        {seasons.map((season) => (
          <Menu.Item
            key={season.id}
            title={`${season.label}${season.episodeCount ? ` (${season.episodeCount})` : ''}${season.badge ? ` · ${season.badge}` : ''}`}
            disabled={season.disabled}
            onPress={() => {
              setVisible(false);
              onChange(season.id);
            }}
            trailingIcon={season.id === selectedSeasonId ? 'check' : undefined}
            testID={childTestID(testID, `option-${season.id}`)}
          />
        ))}
      </Menu>
    </View>
  );
};

const SeasonSegmentedButtons = ({ seasons, selectedSeasonId, onChange, style, containerStyle, testID }: SeasonSelectorProps) => {
  const media = useStreamingTheme();

  // SegmentedButtons handles a handful of options well; beyond that, scroll a row of chips.
  if (seasons.length <= 5) {
    return (
      <View style={[containerStyle, style]} testID={testID}>
        <SegmentedButtons
          value={selectedSeasonId ?? seasons[0]?.id ?? ''}
          onValueChange={onChange}
          buttons={seasons.map((s) => ({ value: s.id, label: s.label, disabled: s.disabled }))}
        />
      </View>
    );
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.chipRow, containerStyle]} style={style} testID={testID}>
      {seasons.map((season) => {
        const selected = season.id === selectedSeasonId;
        return (
          <TouchableRipple
            key={season.id}
            onPress={season.disabled ? undefined : () => onChange(season.id)}
            disabled={season.disabled}
            accessibilityRole="tab"
            accessibilityState={{ selected, disabled: season.disabled }}
            style={[styles.tab, { borderRadius: 8, backgroundColor: selected ? media.colors.progressValue : media.colors.surfaceVariant, opacity: season.disabled ? 0.5 : 1 }]}
            testID={childTestID(testID, `tab-${season.id}`)}
          >
            <Text variant="labelMedium" style={{ color: selected ? '#FFFFFF' : media.colors.onSurfaceVariant }}>
              {season.label}
            </Text>
          </TouchableRipple>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  menuTrigger: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  chipRow: { flexDirection: 'row', gap: 8 },
  tab: { paddingHorizontal: 14, paddingVertical: 8 },
});
