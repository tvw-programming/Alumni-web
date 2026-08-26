import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Icon, Text, TouchableRipple } from 'react-native-paper';

import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useGameTheme } from '../theme/gamingTokens';
import type { Resource, ResourceType } from '../types/domain';

const RESOURCE_META: Record<ResourceType, { icon: string; colorKey: 'livesFull' | 'energyFull' | 'currencyCoins' | 'currencyGems' | 'currencyTokens' }> = {
  lives: { icon: 'heart', colorKey: 'livesFull' },
  energy: { icon: 'lightning-bolt', colorKey: 'energyFull' },
  coins: { icon: 'circle-multiple-outline', colorKey: 'currencyCoins' },
  gems: { icon: 'diamond-stone', colorKey: 'currencyGems' },
  tokens: { icon: 'poker-chip', colorKey: 'currencyTokens' },
};

const formatCountdown = (targetIso: string): string => {
  const diff = Math.max(0, Math.round((new Date(targetIso).getTime() - Date.now()) / 1000));
  const m = Math.floor(diff / 60);
  const s = diff % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

export interface ResourcePillProps extends StyleEscapeHatches {
  resource: Resource;
  compact?: boolean;
  showTimer?: boolean;
  onPress?: () => void;
  onRefill?: () => void;
}

/**
 * Regeneration always reads from a server timestamp (`regenerateAt`), never a
 * client-side countdown that could drift or be reset by changing the device
 * clock. The pill never grants currency or determines purchase success —
 * `onRefill` only signals intent to the commerce service.
 */
export const ResourcePill = ({ resource, compact = false, showTimer = true, onPress, onRefill, style, containerStyle, testID }: ResourcePillProps) => {
  const theme = useAppTheme();
  const gaming = useGameTheme();
  const id = testID ?? `resource-pill-${resource.type}`;
  const meta = RESOURCE_META[resource.type];
  const isLivesOrEnergy = resource.type === 'lives' || resource.type === 'energy';
  const exhausted = resource.status === 'exhausted';

  const [countdown, setCountdown] = useState(resource.regenerateAt ? formatCountdown(resource.regenerateAt) : undefined);

  useEffect(() => {
    if (!resource.regenerateAt || !showTimer) return;
    const timer = setInterval(() => setCountdown(formatCountdown(resource.regenerateAt!)), 1000);
    return () => clearInterval(timer);
  }, [resource.regenerateAt, showTimer]);

  const a11yLabel = `${resource.type}: ${resource.current}${resource.maximum != null ? ` of ${resource.maximum}` : ''}${
    exhausted ? ', exhausted' : ''
  }${resource.regenerateAt && showTimer ? `, next in ${countdown}` : ''}`;

  const content = (
    <View style={[styles.row, { paddingHorizontal: compact ? 8 : 10, paddingVertical: compact ? 4 : 6 }]}>
      {resource.status === 'loading' || resource.status === 'syncing' ? (
        <ActivityIndicator size={14} color={gaming.colors[meta.colorKey]} />
      ) : (
        <Icon source={meta.icon} size={compact ? 14 : 16} color={exhausted ? theme.colors.onSurfaceDisabled : gaming.colors[meta.colorKey]} />
      )}
      <Text variant={compact ? 'labelSmall' : 'labelMedium'} style={{ marginLeft: 4, color: exhausted ? theme.colors.onSurfaceDisabled : theme.colors.onSurface }}>
        {resource.current}
        {isLivesOrEnergy && resource.maximum != null ? ` / ${resource.maximum}` : ''}
      </Text>
      {resource.status === 'error' ? (
        <View style={{ marginLeft: 4 }}>
          <Icon source="alert-circle-outline" size={12} color={gaming.colors.statusError} />
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={[containerStyle, style]} testID={id}>
      <TouchableRipple
        onPress={onPress}
        disabled={!onPress}
        accessibilityRole={onPress ? 'button' : 'text'}
        accessibilityLabel={a11yLabel}
        style={[styles.pill, { backgroundColor: theme.colors.surfaceVariant, borderRadius: theme.radii.pill }]}
      >
        {content}
      </TouchableRipple>

      {isLivesOrEnergy && exhausted ? (
        <View style={{ marginTop: 4 }}>
          <Text variant="labelSmall" style={{ color: gaming.colors.warning }}>
            Out of {resource.type}
          </Text>
          {resource.regenerateAt && showTimer ? (
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Next {resource.type === 'lives' ? 'life' : 'refill'} in {countdown}
            </Text>
          ) : null}
          {onRefill ? (
            <Text variant="labelSmall" onPress={onRefill} accessibilityRole="button" style={{ color: theme.colors.primary, marginTop: 2 }} testID={childTestID(id, 'refill')}>
              Refill
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  pill: { alignSelf: 'flex-start' },
  row: { flexDirection: 'row', alignItems: 'center' },
});
