import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Icon, Text } from 'react-native-paper';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { AppButton } from '@ui/atoms/AppButton';
import { AppSheet } from '@ui/organisms/AppSheet';
import { useMotion, type AnimatableProps } from '@/hooks';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useFintechTheme } from '../theme/fintechTokens';
import { formatMoney } from '../types/money';
import type { Action, TransactionResult, TransactionResultStatus } from '../types/domain';

interface StatusMeta {
  icon: string;
  colorKey: 'statusSuccess' | 'statusPending' | 'statusError' | 'statusReversed' | 'statusNeutral';
  /** Only genuinely final, positive outcomes get celebratory motion. */
  celebrate: boolean;
}

const STATUS_META: Record<TransactionResultStatus, StatusMeta> = {
  processing: { icon: 'progress-clock', colorKey: 'statusNeutral', celebrate: false },
  success: { icon: 'check-circle', colorKey: 'statusSuccess', celebrate: true },
  pending: { icon: 'clock-outline', colorKey: 'statusPending', celebrate: false },
  failed: { icon: 'alert-circle', colorKey: 'statusError', celebrate: false },
  declined: { icon: 'close-circle', colorKey: 'statusError', celebrate: false },
  reversed: { icon: 'undo-variant', colorKey: 'statusReversed', celebrate: false },
  refunded: { icon: 'cash-refund', colorKey: 'statusSuccess', celebrate: false },
};

export interface TransactionStatusSheetProps extends StyleEscapeHatches, Pick<AnimatableProps, 'animated'> {
  visible: boolean;
  result: TransactionResult;
  nextActions?: Action[];
  locale?: string;
  /** Custom illustration slot; a reduced-motion fallback is always rendered. */
  illustration?: React.ReactNode;
  onDismiss: () => void;
}

/**
 * Terminal (and non-terminal) payment outcomes.
 *
 * The critical distinction the spec calls for is enforced by the type: there is
 * no single "done" status. `processing` and `pending` are separate from
 * `success`, so "Payment submitted" can never accidentally render as
 * "Payment completed".
 */
export const TransactionStatusSheet = ({
  visible,
  result,
  nextActions = [],
  locale = 'en-IN',
  illustration,
  onDismiss,
  animated = true,
  style,
  containerStyle,
  testID,
}: TransactionStatusSheetProps) => {
  const theme = useAppTheme();
  const fintech = useFintechTheme();
  const motion = useMotion({ animated });

  const meta = STATUS_META[result.status];
  const color = fintech.colors[meta.colorKey];
  const nonFinal = result.status === 'processing' || result.status === 'pending';

  const scale = useSharedValue(0.6);
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (!visible) return;
    if (!motion.enabled) {
      scale.value = 1;
      return;
    }
    scale.value = meta.celebrate
      ? withSequence(withSpring(1.12, theme.motion.spring.bouncy), withSpring(1, theme.motion.spring.snappy))
      : withSpring(1, theme.motion.spring.gentle);

    if (nonFinal) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 900, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        false,
      );
    }
    return () => cancelAnimation(pulse);
  }, [meta.celebrate, motion.enabled, nonFinal, pulse, scale, theme.motion.spring, visible]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: nonFinal ? 1 - pulse.value * 0.35 : 1,
  }));

  const resolution = useMemo(() => {
    if (!result.expectedResolutionAt) return null;
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(result.expectedResolutionAt));
  }, [locale, result.expectedResolutionAt]);

  return (
    <AppSheet
      visible={visible}
      onDismiss={onDismiss}
      variant="bottom"
      // A processing payment must not be swipe-dismissable into ambiguity.
      dismissible={!nonFinal || result.status === 'pending'}
      enableBackdropPress={result.status !== 'processing'}
      animated={animated}
      containerStyle={containerStyle}
      style={style}
      testID={testID}
    >
      <View style={[styles.root, { gap: theme.spacing.sm, paddingVertical: theme.spacing.md }]}>
        {illustration ?? (
          <Animated.View style={iconStyle} accessibilityElementsHidden>
            {result.status === 'processing' ? (
              <ActivityIndicator size={48} color={color} />
            ) : (
              <Icon source={meta.icon} size={56} color={color} />
            )}
          </Animated.View>
        )}

        {/* Icon + text + shape together — colour is never the only signal. */}
        <Text variant="titleLarge" style={styles.center} accessibilityRole="header">
          {result.title}
        </Text>

        {result.amount ? (
          <Text variant="headlineSmall" style={[styles.center, styles.tabular]}>
            {formatMoney(result.amount, { locale })}
          </Text>
        ) : null}

        {result.recipientName ? (
          <Text variant="bodyMedium" style={[styles.center, { color: theme.colors.onSurfaceVariant }]}>
            to {result.recipientName}
          </Text>
        ) : null}

        <Text
          variant="bodyMedium"
          style={[styles.center, { color: theme.colors.onSurfaceVariant }]}
          accessibilityLiveRegion="polite"
        >
          {result.description}
        </Text>

        {resolution ? (
          <Text variant="labelSmall" style={[styles.center, { color: fintech.colors.statusPending }]}>
            Expected by {resolution}
          </Text>
        ) : null}

        {result.transactionId ? (
          <Text
            variant="labelSmall"
            selectable
            style={[styles.center, { color: theme.colors.onSurfaceVariant }]}
            testID={childTestID(testID, 'reference')}
          >
            Reference {result.transactionId}
          </Text>
        ) : null}

        <View style={[styles.actions, { marginTop: theme.spacing.md, gap: theme.spacing.sm }]}>
          {nextActions.map((action, index) => (
            <AppButton
              key={action.key}
              variant={index === 0 ? 'primary' : action.destructive ? 'danger' : 'ghost'}
              fullWidth
              disabled={action.disabled}
              onPress={action.onPress}
              debounceMs={600}
              testID={childTestID(testID, `action-${action.key}`)}
            >
              {action.label}
            </AppButton>
          ))}
        </View>
      </View>
    </AppSheet>
  );
};

/** Maps a backend status string to the component's contract, with a safe default. */
export const toTransactionResult = (
  raw: { status?: string } & Partial<TransactionResult>,
): TransactionResult => {
  const status = (raw.status ?? 'processing') as TransactionResultStatus;
  const known = STATUS_META[status] ? status : 'processing';
  return {
    status: known,
    title: raw.title ?? 'Payment submitted',
    description: raw.description ?? 'We are still confirming this payment.',
    transactionId: raw.transactionId,
    amount: raw.amount,
    recipientName: raw.recipientName,
    expectedResolutionAt: raw.expectedResolutionAt,
  };
};

const styles = StyleSheet.create({
  root: { alignItems: 'center' },
  center: { textAlign: 'center' },
  tabular: { fontVariant: ['tabular-nums'] },
  actions: { width: '100%' },
});
