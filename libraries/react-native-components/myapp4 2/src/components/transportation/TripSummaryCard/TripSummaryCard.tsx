import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, Text, TouchableRipple } from 'react-native-paper';

import { AppButton } from '@ui/atoms/AppButton';
import { AppCard } from '@ui/molecules/AppCard';
import { MoneyRow } from '@ui/molecules/MoneyRow';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useRideTheme } from '../theme/transportationTokens';
import type { TripStatus, TripSummary } from '../types/domain';
import { DriverCard } from '../DriverCard/DriverCard';

const STATUS_META: Record<TripStatus, { label: string; icon: string; colorKey: 'statusCompleted' | 'statusCanceled' | 'statusFailed' }> = {
  completed: { label: 'Completed', icon: 'check-circle', colorKey: 'statusCompleted' },
  canceled: { label: 'Canceled', icon: 'cancel', colorKey: 'statusCanceled' },
  refunded: { label: 'Refunded', icon: 'cash-refund', colorKey: 'statusCompleted' },
  disputed: { label: 'Fare disputed', icon: 'alert-circle-outline', colorKey: 'statusFailed' },
};

export interface TripSummaryCardProps extends StyleEscapeHatches {
  trip: TripSummary;
  locale?: string;
  onViewReceipt?: (trip: TripSummary) => void;
  onReportIssue?: (trip: TripSummary) => void;
  onAddTip?: (trip: TripSummary) => void;
  onFindLostItem?: (trip: TripSummary) => void;
}

/**
 * Every action here is bound to this exact trip id — receipt, dispute and
 * lost-item all pass `trip` through, never a loosely-scoped "current trip"
 * reference. Refunded and disputed states render as first-class facts next
 * to the total, not as a footnote.
 */
export const TripSummaryCard = ({ trip, locale = 'en-IN', onViewReceipt, onReportIssue, onAddTip, onFindLostItem, style, containerStyle, testID }: TripSummaryCardProps) => {
  const theme = useAppTheme();
  const ride = useRideTheme();
  const id = testID ?? `trip-summary-${trip.id}`;
  const [expanded, setExpanded] = useState(false);
  const meta = STATUS_META[trip.status];

  return (
    <AppCard variant="outlined" containerStyle={containerStyle} style={style} testID={id}>
      <View style={{ gap: theme.spacing.sm }}>
        <View style={styles.row}>
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, flex: 1 }}>
            {trip.startedAt ? new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(trip.startedAt)) : '—'}
          </Text>
          <View style={styles.row}>
            <Icon source={meta.icon} size={14} color={ride.colors[meta.colorKey]} />
            <Text variant="labelSmall" style={{ color: ride.colors[meta.colorKey], marginLeft: 4 }}>
              {meta.label}
            </Text>
          </View>
        </View>

        <View style={{ gap: 2 }}>
          <RouteRow icon="circle-outline" label={trip.pickup.label} />
          <RouteRow icon="map-marker" label={trip.dropoff.label} />
        </View>

        <View style={styles.row}>
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {trip.rideType}
            {trip.distance ? ` · ${trip.distance}` : ''}
            {trip.duration ? ` · ${trip.duration}` : ''}
          </Text>
        </View>

        {trip.driver ? (
          <TouchableRipple onPress={() => setExpanded((v) => !v)} accessibilityRole="button" accessibilityLabel={`Driver: ${trip.driver.name}`}>
            <View style={styles.row}>
              <Text variant="bodySmall" style={{ flex: 1 }}>
                {trip.driver.name} · {trip.driver.vehicle.plateNumber}
              </Text>
              <Icon source={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={theme.colors.onSurfaceVariant} />
            </View>
          </TouchableRipple>
        ) : null}

        {expanded && trip.driver ? <DriverCard driver={trip.driver} showContactActions={false} showSafetyAction={false} /> : null}

        <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.outlineVariant }} />

        {trip.fareLines.map((line) => (
          <MoneyRow key={line.id} label={line.label} value={line.amount} locale={locale} hint={line.explanation} emphasis={line.kind === 'discount' ? 'savings' : 'default'} />
        ))}
        {trip.tip ? <MoneyRow label="Tip" value={trip.tip} locale={locale} /> : null}
        <MoneyRow label="Total paid" value={trip.total} emphasis="total" locale={locale} />

        {trip.paymentMethod ? (
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {trip.paymentMethod.label}
          </Text>
        ) : null}

        <View style={[styles.row, { flexWrap: 'wrap', gap: theme.spacing.md }]}>
          {onViewReceipt ? (
            <ActionLink label="View receipt" onPress={() => onViewReceipt(trip)} testID={childTestID(id, 'receipt')} />
          ) : null}
          {onAddTip && !trip.tip && trip.status === 'completed' ? (
            <ActionLink label="Add a tip" onPress={() => onAddTip(trip)} testID={childTestID(id, 'tip')} />
          ) : null}
          {onReportIssue ? <ActionLink label="Report a fare issue" onPress={() => onReportIssue(trip)} testID={childTestID(id, 'report')} /> : null}
          {onFindLostItem ? <ActionLink label="Find a lost item" onPress={() => onFindLostItem(trip)} testID={childTestID(id, 'lost-item')} /> : null}
        </View>
      </View>
    </AppCard>
  );
};

const RouteRow = ({ icon, label }: { icon: string; label: string }) => {
  const theme = useAppTheme();
  return (
    <View style={styles.row}>
      <Icon source={icon} size={13} color={theme.colors.onSurfaceVariant} />
      <Text variant="bodySmall" style={{ marginLeft: 8, flex: 1 }} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
};

const ActionLink = ({ label, onPress, testID }: { label: string; onPress: () => void; testID?: string }) => {
  const theme = useAppTheme();
  return (
    <TouchableRipple onPress={onPress} accessibilityRole="button" accessibilityLabel={label} testID={testID}>
      <Text variant="labelMedium" style={{ color: theme.colors.primary }}>
        {label}
      </Text>
    </TouchableRipple>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
});
