import React, { forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, View } from 'react-native';
import { IconButton, Text } from 'react-native-paper';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { AppButton } from '@ui/atoms/AppButton';
import { SkeletonLoader } from '@ui/atoms/Skeleton';
import { AppCard } from '@ui/molecules/AppCard';
import { StateView } from '@ui/molecules/StateView';
import { useMotion, type AnimatableProps } from '@/hooks';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useFintechTheme } from '../theme/fintechTokens';
import { formatMoney, formatMoneyForA11y, maskAmount, type Money } from '../types/money';
import type { Action, DataState } from '../types/domain';

export type BalanceCardVariant =
  | 'default'
  | 'compact'
  | 'hero'
  | 'multiCurrency'
  | 'negative'
  | 'skeleton'
  | 'error';

export type BalanceType = 'current' | 'available' | 'pending';
export type PrivacyMode = 'masked' | 'visible';

export interface BalanceCardProps extends StyleEscapeHatches, Pick<AnimatableProps, 'animated' | 'entering'> {
  accountName: string;
  amount: Money;
  /** Available-vs-current distinction, or a second currency in `multiCurrency`. */
  secondaryAmount?: Money;
  secondaryLabel?: string;
  balanceType?: BalanceType;
  variant?: BalanceCardVariant;
  privacyMode?: PrivacyMode;
  status?: DataState;
  /** Card artwork, network mark, or account avatar. */
  leading?: React.ReactNode;
  actions?: Action[];
  /** ISO timestamp of the last successful refresh — drives the stale indicator. */
  lastUpdatedAt?: string;
  /** Minutes after which the balance re-masks itself. 0 disables the timer. */
  autoMaskAfterMinutes?: number;
  /** Message shown instead of the balance when KYC/setup is incomplete. */
  unavailableReason?: string;
  locale?: string;
  onToggleVisibility?: () => void;
  onPress?: () => void;
  onRefresh?: () => void;
  onRetry?: () => void;
}

const STALE_AFTER_MS = 5 * 60 * 1000;

/**
 * The user's financial position, shown immediately.
 *
 * Two things here are load-bearing and easy to get wrong elsewhere:
 * masking swaps digits for bullets *without changing the card height*, and the
 * amount uses tabular numerals so it does not jitter as digits change.
 */
export const BalanceCard = forwardRef<View, BalanceCardProps>(function BalanceCard(
  {
    accountName,
    amount,
    secondaryAmount,
    secondaryLabel,
    balanceType = 'current',
    variant = 'default',
    privacyMode,
    status = 'default',
    leading,
    actions = [],
    lastUpdatedAt,
    autoMaskAfterMinutes = 2,
    unavailableReason,
    locale = 'en-IN',
    onToggleVisibility,
    onPress,
    onRefresh,
    onRetry,
    animated = true,
    entering = 'fade',
    style,
    containerStyle,
    testID,
  },
  ref,
) {
  const theme = useAppTheme();
  const fintech = useFintechTheme();
  const motion = useMotion({ animated });

  // Uncontrolled privacy state, unless the consumer drives it.
  const [internalMasked, setInternalMasked] = useState(true);
  const masked = privacyMode ? privacyMode === 'masked' : internalMasked;

  const toggle = useCallback(() => {
    if (!privacyMode) setInternalMasked((prev) => !prev);
    onToggleVisibility?.();
  }, [onToggleVisibility, privacyMode]);

  /**
   * Privacy policy: re-mask when the app backgrounds, and after a timeout.
   * A balance left visible on a handed-over phone is a real complaint, not a
   * hypothetical one.
   */
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (masked || privacyMode) return;
    if (autoMaskAfterMinutes > 0) {
      timer.current = setTimeout(() => setInternalMasked(true), autoMaskAfterMinutes * 60_000);
    }
    const subscription = AppState.addEventListener('change', (next) => {
      if (next !== 'active') setInternalMasked(true);
    });
    return () => {
      if (timer.current) clearTimeout(timer.current);
      subscription.remove();
    };
  }, [autoMaskAfterMinutes, masked, privacyMode]);

  const isSkeleton = variant === 'skeleton' || status === 'loading';
  const isError = variant === 'error' || status === 'error';
  const compact = variant === 'compact';
  const hero = variant === 'hero';

  const stale = lastUpdatedAt ? Date.now() - new Date(lastUpdatedAt).getTime() > STALE_AFTER_MS : false;
  const negative = amount.minorUnits < 0;

  const amountColor = negative ? fintech.colors.amountNegative : fintech.colors.amountDebit;
  const displayAmount = masked ? maskAmount(amount) : formatMoney(amount, { locale });

  // Screen readers get the spoken form, or an explicit "hidden" — never bullets.
  const a11yAmount = masked ? 'Balance hidden' : formatMoneyForA11y(amount, locale);

  if (isSkeleton) {
    return (
      <AppCard variant="filled" containerStyle={containerStyle} testID={childTestID(testID, 'skeleton')}>
        <SkeletonLoader shape="text" lines={1} width="40%" height={12} />
        <SkeletonLoader shape="text" lines={1} width="65%" height={32} containerStyle={{ marginTop: theme.spacing.sm }} />
        {actions.length > 0 && (
          <SkeletonLoader shape="text" lines={1} height={36} containerStyle={{ marginTop: theme.spacing.md }} />
        )}
      </AppCard>
    );
  }

  if (isError) {
    return (
      <AppCard variant="outlined" containerStyle={containerStyle} testID={childTestID(testID, 'error')}>
        <StateView
          preset={status === 'offline' ? 'offline' : 'error'}
          compact
          title={status === 'offline' ? 'Showing your last known balance' : 'We could not load your balance'}
          description={
            status === 'offline' && lastUpdatedAt
              ? `Last updated ${new Date(lastUpdatedAt).toLocaleTimeString(locale)}`
              : undefined
          }
          primaryAction={onRetry ? { label: 'Try again', onPress: onRetry } : undefined}
        />
      </AppCard>
    );
  }

  return (
    <AppCard
      ref={ref}
      variant={hero ? 'filled' : 'elevated'}
      onPress={onPress}
      entering={entering}
      animated={animated}
      padded
      contentPadding={hero ? 'lg' : 'md'}
      containerStyle={containerStyle}
      style={[{ backgroundColor: fintech.colors.surfaceFinancial }, style]}
      accessibilityLabel={`${accountName}, ${balanceType} balance, ${a11yAmount}`}
      testID={testID}
    >
      <View style={styles.headerRow}>
        {leading ? <View style={{ marginRight: theme.spacing.sm }}>{leading}</View> : null}

        <View style={styles.flex}>
          <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
            {accountName}
          </Text>
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {balanceType === 'current' ? 'Current balance' : balanceType === 'available' ? 'Available' : 'Pending'}
          </Text>
        </View>

        {status === 'locked' && (
          <IconButton icon="lock" size={18} accessibilityLabel="Account locked" disabled />
        )}

        <IconButton
          icon={masked ? 'eye-off-outline' : 'eye-outline'}
          size={theme.sizing.icon.md}
          onPress={toggle}
          // The label changes with state — an eye icon alone is not enough.
          accessibilityLabel={masked ? 'Show balance' : 'Hide balance'}
          accessibilityState={{ expanded: !masked }}
          testID={childTestID(testID, 'visibility')}
        />
      </View>

      {unavailableReason ? (
        <View style={{ marginTop: theme.spacing.sm }}>
          <Text variant="bodyMedium" style={{ color: fintech.colors.statusPending }}>
            {unavailableReason}
          </Text>
        </View>
      ) : (
        <Animated.View
          entering={motion.enabled ? FadeIn.duration(motion.ms('fast')) : undefined}
          exiting={motion.enabled ? FadeOut.duration(motion.ms('fast')) : undefined}
          // Fixed min height: masking must not resize the card.
          style={[styles.amountRow, { minHeight: hero ? 52 : compact ? 30 : 40 }]}
        >
          <Text
            variant={hero ? 'displaySmall' : compact ? 'titleLarge' : 'headlineMedium'}
            style={[styles.tabular, { color: amountColor }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            accessibilityElementsHidden
          >
            {displayAmount}
          </Text>
          {!masked && (
            <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, marginLeft: theme.spacing.xs }}>
              {amount.currency}
            </Text>
          )}
        </Animated.View>
      )}

      {secondaryAmount && !masked && (
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {secondaryLabel ?? 'Available'}: {formatMoney(secondaryAmount, { locale })}
        </Text>
      )}

      {(stale || status === 'offline') && (
        <Pressable
          onPress={onRefresh}
          disabled={!onRefresh}
          style={[styles.staleRow, { marginTop: theme.spacing.xs }]}
          accessibilityRole="button"
          accessibilityLabel="Balance may be out of date. Tap to refresh."
          testID={childTestID(testID, 'stale')}
        >
          <Text variant="labelSmall" style={{ color: fintech.colors.statusPending }}>
            {status === 'offline' ? 'Offline — showing cached balance' : 'May be out of date'}
            {onRefresh ? ' · Refresh' : ''}
          </Text>
        </Pressable>
      )}

      {actions.length > 0 && (
        <View style={[styles.actions, { marginTop: theme.spacing.md, gap: theme.spacing.sm }]}>
          {actions.map((action) => (
            <AppButton
              key={action.key}
              variant={action.destructive ? 'danger' : 'secondary'}
              size="sm"
              icon={action.icon}
              disabled={action.disabled || status === 'locked'}
              onPress={action.onPress}
              debounceMs={400}
              testID={childTestID(testID, `action-${action.key}`)}
            >
              {action.label}
            </AppButton>
          ))}
        </View>
      )}
    </AppCard>
  );
});

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  amountRow: { flexDirection: 'row', alignItems: 'baseline' },
  // Stops the balance shifting horizontally as digits change.
  tabular: { fontVariant: ['tabular-nums'] },
  staleRow: { alignSelf: 'flex-start' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
});
