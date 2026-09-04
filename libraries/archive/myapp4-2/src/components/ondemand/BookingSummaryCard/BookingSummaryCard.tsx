import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Divider, Icon, Text, TouchableRipple } from 'react-native-paper';

import { AppButton } from '@ui/atoms/AppButton';
import { AppCard } from '@ui/molecules/AppCard';
import { MoneyRow } from '@ui/molecules/MoneyRow';
import { SkeletonLoader } from '@ui/atoms/Skeleton';
import { useAppTheme } from '@/theme';
import { childTestID, initialsOf } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useServiceTheme } from '../theme/ondemandTokens';
import type { BookingStatus, BookingSummary } from '../types/domain';

const STATUS_META: Record<BookingStatus, { label: string; icon: string; colorKey: 'statusSearching' | 'statusAssigned' | 'availableNow' | 'statusFailed' } | null> = {
  draft: null,
  validating: { label: 'Checking availability', icon: 'progress-clock', colorKey: 'statusSearching' },
  ready: null,
  submitted: { label: 'Request sent', icon: 'clock-outline', colorKey: 'statusAssigned' },
  confirmed: { label: 'Confirmed', icon: 'check-circle', colorKey: 'availableNow' },
  error: { label: "Couldn't confirm", icon: 'alert-circle-outline', colorKey: 'statusFailed' },
};

export interface BookingSummaryCardProps extends StyleEscapeHatches {
  summary: BookingSummary;
  locale?: string;
  loading?: boolean;
  onChangeSlot?: () => void;
  onChangeLocation?: () => void;
  onChangeProvider?: () => void;
  onChangeAddOns?: () => void;
  onExplainPrice?: () => void;
  onConfirm?: () => void;
  onRetry?: () => void;
  confirmLabel?: string;
  confirming?: boolean;
}

/**
 * The pre-commitment checkpoint: what, who, when, where, how much.
 *
 * Every fact has its own labelled "Change" action, and the total is never the
 * only signal that something moved — `priceChangedNote` is rendered right next
 * to it. Confirming is disabled while the summary is still validating, so a tap
 * can never race an in-flight revalidation.
 */
export const BookingSummaryCard = ({
  summary,
  locale = 'en-IN',
  loading = false,
  onChangeSlot,
  onChangeLocation,
  onChangeProvider,
  onChangeAddOns,
  onExplainPrice,
  onConfirm,
  onRetry,
  confirmLabel = 'Confirm and pay',
  confirming = false,
  style,
  containerStyle,
  testID,
}: BookingSummaryCardProps) => {
  const theme = useAppTheme();
  const service = useServiceTheme();
  const id = testID ?? 'booking-summary';

  const meta = STATUS_META[summary.status];
  const locked = summary.status === 'confirmed' || summary.status === 'submitted';
  const validating = summary.status === 'validating';

  const slotLabel = useMemo(() => {
    if (!summary.slot) return undefined;
    const start = new Date(summary.slot.startsAt);
    return `${new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short' }).format(start)}, ${new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(start)}`;
  }, [locale, summary.slot]);

  if (loading) {
    return (
      <AppCard variant="outlined" containerStyle={containerStyle} testID={childTestID(id, 'loading')}>
        <SkeletonLoader shape="text" lines={4} />
        <SkeletonLoader shape="text" lines={1} height={44} containerStyle={{ marginTop: 12 }} />
      </AppCard>
    );
  }

  return (
    <AppCard variant="outlined" containerStyle={containerStyle} style={style} testID={id}>
      <View style={{ gap: theme.spacing.sm }}>
        <View style={styles.row}>
          <Text variant="titleMedium" accessibilityRole="header" style={styles.flex}>
            Review your booking
          </Text>
          {meta ? (
            <View style={[styles.row, { gap: 3 }]}>
              <Icon source={meta.icon} size={14} color={service.colors[meta.colorKey]} />
              <Text variant="labelSmall" style={{ color: service.colors[meta.colorKey] }}>
                {meta.label}
              </Text>
            </View>
          ) : null}
        </View>

        {/* What */}
        <DetailRow icon="briefcase-outline" label={summary.service.title} sub={summary.service.categoryLabel} />

        {/* Who */}
        {summary.provider ? (
          <DetailRow
            icon="account-outline"
            label={summary.provider.name}
            action={onChangeProvider ? { label: 'Change provider', onPress: onChangeProvider } : undefined}
            testID={childTestID(id, 'provider')}
          />
        ) : null}

        {/* When */}
        {slotLabel ? (
          <DetailRow
            icon="calendar-clock"
            label={slotLabel}
            sub={summary.slot?.timezoneLabel}
            action={onChangeSlot ? { label: 'Change time', onPress: onChangeSlot } : undefined}
            testID={childTestID(id, 'slot')}
          />
        ) : null}

        {/* Where */}
        {summary.location ? (
          <DetailRow
            icon="map-marker-outline"
            label={summary.location.lines.join(', ')}
            sub={summary.location.instructions}
            action={onChangeLocation ? { label: 'Change address', onPress: onChangeLocation } : undefined}
            testID={childTestID(id, 'location')}
          />
        ) : null}

        {summary.duration ? <DetailRow icon="timer-outline" label={summary.duration} /> : null}

        {summary.addOns?.length ? (
          <DetailRow
            icon="plus-box-outline"
            label={`${summary.addOns.length} add-on${summary.addOns.length === 1 ? '' : 's'}`}
            sub={summary.addOns.map((a) => a.label).join(', ')}
            action={onChangeAddOns ? { label: 'Change add-ons', onPress: onChangeAddOns } : undefined}
            testID={childTestID(id, 'addons')}
          />
        ) : null}

        <Divider style={{ marginVertical: theme.spacing.xs }} />

        {/* How much */}
        <MoneyRow label="Subtotal" value={summary.subtotal} locale={locale} testID={childTestID(id, 'subtotal')} />
        {summary.discount ? <MoneyRow label="Discount" value={summary.discount} emphasis="savings" locale={locale} /> : null}
        {summary.fees ? (
          <MoneyRow label="Fees" value={summary.fees} locale={locale} onExplain={onExplainPrice} explainLabel="What do fees cover?" />
        ) : null}
        {summary.tax ? <MoneyRow label="Tax" value={summary.tax} locale={locale} /> : null}

        <Divider style={{ marginVertical: theme.spacing.xs }} />
        <MoneyRow label="Total" value={summary.total} emphasis="total" locale={locale} testID={childTestID(id, 'total')} />

        {summary.priceChangedNote ? (
          <View
            style={[
              styles.notice,
              { backgroundColor: theme.colors.errorContainer, borderRadius: theme.radii.md, padding: theme.spacing.sm, marginTop: theme.spacing.xs },
            ]}
            accessibilityLiveRegion="assertive"
          >
            <Icon source="alert-circle-outline" size={14} color={theme.colors.onErrorContainer} />
            <Text variant="labelSmall" style={{ color: theme.colors.onErrorContainer, marginLeft: 6, flex: 1 }}>
              {summary.priceChangedNote}
            </Text>
          </View>
        ) : null}

        {summary.status === 'error' ? (
          <Text variant="labelSmall" style={{ color: service.colors.statusFailed }}>
            We couldn't complete your booking. Your payment was not charged.
          </Text>
        ) : null}

        {onConfirm && !locked ? (
          <AppButton
            variant={summary.status === 'error' ? 'danger' : 'primary'}
            size="lg"
            fullWidth
            disabled={validating}
            loading={confirming}
            debounceMs={1200}
            onPress={summary.status === 'error' ? onRetry ?? onConfirm : onConfirm}
            containerStyle={{ marginTop: theme.spacing.sm }}
            testID={childTestID(id, 'confirm')}
          >
            {summary.status === 'error' ? 'Try again' : validating ? 'Checking…' : confirmLabel}
          </AppButton>
        ) : null}

        {summary.status === 'confirmed' ? (
          <View
            style={[
              styles.notice,
              { backgroundColor: service.colors.surfaceSelected, borderRadius: theme.radii.md, padding: theme.spacing.sm, marginTop: theme.spacing.xs },
            ]}
          >
            <Icon source="check-circle" size={15} color={service.colors.availableNow} />
            <Text variant="labelMedium" style={{ color: service.colors.onSurfaceSelected, marginLeft: 6 }}>
              Booking confirmed
            </Text>
          </View>
        ) : null}
      </View>
    </AppCard>
  );
};

const DetailRow = ({
  icon,
  label,
  sub,
  action,
  testID,
}: {
  icon: string;
  label: string;
  sub?: string;
  action?: { label: string; onPress: () => void };
  testID?: string;
}) => {
  const theme = useAppTheme();
  return (
    <View style={[styles.row, { gap: theme.spacing.sm }]} testID={testID}>
      <Icon source={icon} size={18} color={theme.colors.onSurfaceVariant} />
      <View style={styles.flex}>
        <Text variant="bodyMedium" numberOfLines={2}>
          {label}
        </Text>
        {sub ? (
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={2}>
            {sub}
          </Text>
        ) : null}
      </View>
      {action ? (
        <TouchableRipple
          onPress={action.onPress}
          borderless
          accessibilityRole="button"
          accessibilityLabel={action.label}
          testID={childTestID(testID, 'change')}
        >
          <Text variant="labelSmall" style={{ color: theme.colors.primary }}>
            {action.label}
          </Text>
        </TouchableRipple>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  notice: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
});
