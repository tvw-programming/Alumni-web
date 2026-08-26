import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, Text, TouchableRipple } from 'react-native-paper';

import { formatMoney } from '@ui/primitives/money';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useAgriLogisticsTheme } from '../theme/agritechTokens';
import type { MandiPrice, PriceDeltaDirection } from '../types/domain';

export interface MandiPriceListItemProps extends StyleEscapeHatches {
  price: MandiPrice;
  onPress?: (price: MandiPrice) => void;
}

const DELTA_META: Record<PriceDeltaDirection, { icon: string; colorKey: 'priceUp' | 'priceDown' | 'priceFlat'; verb: string }> = {
  up: { icon: 'arrow-up-thin', colorKey: 'priceUp', verb: 'Up' },
  down: { icon: 'arrow-down-thin', colorKey: 'priceDown', verb: 'Down' },
  flat: { icon: 'minus', colorKey: 'priceFlat', verb: 'Stable' },
};

/**
 * Delta colour is never the only signal — an arrow icon and a "Up"/"Down"/
 * "Stable" word always accompany it. A stale price says so in text rather
 * than presenting yesterday's number as live.
 */
export const MandiPriceListItem = ({ price, onPress, style, containerStyle, testID }: MandiPriceListItemProps) => {
  const theme = useAppTheme();
  const agri = useAgriLogisticsTheme();
  const id = testID ?? `mandi-${price.id}`;
  const deltaMeta = price.deltaDirection ? DELTA_META[price.deltaDirection] : undefined;

  return (
    <TouchableRipple
      onPress={onPress ? () => onPress(price) : undefined}
      disabled={!onPress}
      style={[styles.row, { borderRadius: theme.radii.sm }, containerStyle, style]}
      testID={id}
    >
      <View style={styles.rowInner}>
        <View style={styles.flex}>
          <Text variant="bodyMedium">
            {price.commodity}
            {price.variety ? ` · ${price.variety}` : ''}
          </Text>
          <Text variant="labelSmall" style={{ color: agri.colors.onSurfaceVariant }}>
            {price.mandi}
          </Text>
        </View>
        <View style={styles.priceCol}>
          <Text variant="bodyMedium">
            {formatMoney(price.currentPrice)} / {price.unitLabel}
          </Text>
          {deltaMeta ? (
            <View style={styles.row}>
              <Icon source={deltaMeta.icon} size={12} color={agri.colors[deltaMeta.colorKey]} />
              <Text variant="labelSmall" style={{ color: agri.colors[deltaMeta.colorKey], marginLeft: 2 }}>
                {deltaMeta.verb}
                {price.delta != null && price.deltaDirection !== 'flat' ? ` ${formatMoney({ minorUnits: Math.abs(price.delta), currency: price.currentPrice.currency })}` : ''}
              </Text>
            </View>
          ) : null}
          <Text variant="labelSmall" style={{ color: price.stale ? agri.colors.warning : agri.colors.onSurfaceVariant }}>
            {price.stale ? `Last updated ${price.updatedAt ?? 'earlier'}` : price.updatedAt ? `Updated ${price.updatedAt}` : 'Price unavailable'}
          </Text>
        </View>
      </View>
    </TouchableRipple>
  );
};

const styles = StyleSheet.create({
  row: { paddingVertical: 4 },
  rowInner: { flexDirection: 'row', alignItems: 'flex-start' },
  flex: { flex: 1 },
  priceCol: { alignItems: 'flex-end' },
});
