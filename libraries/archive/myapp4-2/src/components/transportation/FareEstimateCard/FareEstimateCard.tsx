import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, Text, TouchableRipple } from 'react-native-paper';

import { AppButton } from '@ui/atoms/AppButton';
import { AppCard } from '@ui/molecules/AppCard';
import { MoneyRow } from '@ui/molecules/MoneyRow';
import { formatMoney } from '@ui/primitives/money';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useRideTheme } from '../theme/transportationTokens';
import type { FareEstimate, PaymentMethod } from '../types/domain';

export interface FareEstimateCardProps extends StyleEscapeHatches {
  estimate: FareEstimate;
  pickupLabel?: string;
  dropoffLabel?: string;
  eta?: string;
  paymentMethod?: PaymentMethod;
  locale?: string;
  requesting?: boolean;
  onOpenBreakdown?: () => void;
  onRefresh?: () => void;
  onRequest?: () => void;
  onChangePayment?: () => void;
}

/**
 * An estimate is never labelled final when route, tolls, waiting time or
 * demand can still move it — "upfront" and "estimated" render with different
 * copy, and a `changed` status always shows the old and new amount together
 * rather than silently swapping the number.
 */
export const FareEstimateCard = ({
  estimate,
  pickupLabel,
  dropoffLabel,
  eta,
  paymentMethod,
  locale = 'en-IN',
  requesting = false,
  onOpenBreakdown,
  onRefresh,
  onRequest,
  onChangePayment,
  style,
  containerStyle,
  testID,
}: FareEstimateCardProps) => {
  const theme = useAppTheme();
  const ride = useRideTheme();
  const id = testID ?? 'fare-estimate-card';
  const [showBreakdown, setShowBreakdown] = useState(false);

  const expired = estimate.status === 'expired';
  const calculating = estimate.status === 'calculating';
  const changed = estimate.status === 'changed';

  const priceLabel = estimate.amount
    ? formatMoney(estimate.amount, { locale })
    : estimate.minAmount && estimate.maxAmount
      ? `${formatMoney(estimate.minAmount, { locale })} – ${formatMoney(estimate.maxAmount, { locale })}`
      : '—';

  return (
    <AppCard variant="outlined" containerStyle={containerStyle} style={style} testID={id}>
      <View style={{ gap: theme.spacing.sm }}>
        {(pickupLabel || dropoffLabel) && (
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={2}>
            {pickupLabel ?? '—'} → {dropoffLabel ?? '—'}
          </Text>
        )}

        <View style={styles.row}>
          <View style={styles.flex}>
            <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              {estimate.status === 'upfront' ? 'Upfront price' : 'Estimated fare'}
            </Text>
            <Text variant="headlineSmall">{calculating ? 'Calculating…' : priceLabel}</Text>
          </View>
          {eta ? (
            <View style={styles.center}>
              <Icon source="clock-outline" size={16} color={theme.colors.onSurfaceVariant} />
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {eta}
              </Text>
            </View>
          ) : null}
        </View>

        {estimate.includes && estimate.includes.length > 0 ? (
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            Includes {estimate.includes.join(', ')}
          </Text>
        ) : null}

        {changed && estimate.previousAmount && estimate.amount ? (
          <View style={[styles.notice, { backgroundColor: theme.colors.errorContainer, borderRadius: theme.radii.sm, padding: theme.spacing.sm }]} accessibilityLiveRegion="assertive">
            <Icon source="alert-circle-outline" size={14} color={theme.colors.onErrorContainer} />
            <Text variant="labelSmall" style={{ color: theme.colors.onErrorContainer, marginLeft: 6, flex: 1 }}>
              Fare changed from {formatMoney(estimate.previousAmount, { locale })} to {formatMoney(estimate.amount, { locale })}. Review updated fare.
            </Text>
          </View>
        ) : null}

        {expired ? (
          <View style={[styles.notice, { backgroundColor: theme.colors.errorContainer, borderRadius: theme.radii.sm, padding: theme.spacing.sm }]}>
            <Icon source="clock-alert-outline" size={14} color={theme.colors.onErrorContainer} />
            <Text variant="labelSmall" style={{ color: theme.colors.onErrorContainer, marginLeft: 6, flex: 1 }}>
              This estimate expired. Refresh to get a current price.
            </Text>
            {onRefresh ? (
              <Text variant="labelSmall" onPress={onRefresh} accessibilityRole="button" style={{ color: theme.colors.onErrorContainer, textDecorationLine: 'underline' }}>
                Refresh
              </Text>
            ) : null}
          </View>
        ) : null}

        {estimate.breakdown && estimate.breakdown.length > 0 ? (
          <View>
            <TouchableRipple onPress={() => { setShowBreakdown((v) => !v); onOpenBreakdown?.(); }} accessibilityRole="button" accessibilityLabel="View fare breakdown" testID={childTestID(id, 'toggle-breakdown')}>
              <View style={styles.row}>
                <Text variant="labelMedium" style={{ color: theme.colors.primary, flex: 1 }}>
                  Fare details
                </Text>
                <Icon source={showBreakdown ? 'chevron-up' : 'chevron-down'} size={18} color={theme.colors.primary} />
              </View>
            </TouchableRipple>
            {showBreakdown ? (
              <View style={{ marginTop: 4, gap: 2 }}>
                {estimate.breakdown.map((line) => (
                  <MoneyRow key={line.id} label={line.label} value={line.amount} locale={locale} hint={line.explanation} />
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={styles.row}>
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, flex: 1 }}>
            Price may change if you change your destination. Additional charges may apply.
          </Text>
        </View>

        {paymentMethod ? (
          <TouchableRipple onPress={onChangePayment} disabled={!onChangePayment} accessibilityRole={onChangePayment ? 'button' : undefined} accessibilityLabel={`Payment method: ${paymentMethod.label}`} testID={childTestID(id, 'payment')}>
            <View style={styles.row}>
              <Icon source={paymentMethod.kind === 'cash' ? 'cash' : paymentMethod.kind === 'card' ? 'credit-card-outline' : 'wallet-outline'} size={16} color={theme.colors.onSurfaceVariant} />
              <Text variant="bodySmall" style={{ marginLeft: 6, flex: 1 }}>
                {paymentMethod.label}
              </Text>
              {onChangePayment ? (
                <Text variant="labelSmall" style={{ color: theme.colors.primary }}>
                  Change
                </Text>
              ) : null}
            </View>
          </TouchableRipple>
        ) : null}

        {onRequest ? (
          <AppButton variant="primary" size="lg" fullWidth disabled={calculating || expired} loading={requesting} debounceMs={1000} onPress={onRequest} testID={childTestID(id, 'request')}>
            Request ride
          </AppButton>
        ) : null}
      </View>
    </AppCard>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  center: { alignItems: 'center' },
  notice: { flexDirection: 'row', alignItems: 'center' },
});
