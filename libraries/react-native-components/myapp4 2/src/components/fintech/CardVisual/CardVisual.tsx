import React, { forwardRef, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, Text, TouchableRipple } from 'react-native-paper';
import Animated from 'react-native-reanimated';

import { useMotion, usePressAnimation, type AnimatableProps } from '@/hooks';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useFintechTheme } from '../theme/fintechTokens';
import type { CardNetwork, CardStatus, CardVariant } from '../types/domain';

const NETWORK_LABEL: Record<CardNetwork, string> = {
  visa: 'VISA',
  mastercard: 'Mastercard',
  amex: 'AMEX',
  rupay: 'RuPay',
  discover: 'Discover',
  unknown: '',
};

const STATUS_META: Record<CardStatus, { label: string; icon: string; blocking: boolean }> = {
  active: { label: 'Active', icon: 'check-circle', blocking: false },
  frozen: { label: 'Frozen', icon: 'snowflake', blocking: true },
  expired: { label: 'Expired', icon: 'calendar-remove', blocking: true },
  pending: { label: 'Not activated', icon: 'clock-outline', blocking: true },
  terminated: { label: 'Cancelled', icon: 'close-circle', blocking: true },
};

export interface CardVisualProps extends StyleEscapeHatches, Pick<AnimatableProps, 'animated' | 'entering'> {
  variant?: CardVariant;
  status?: CardStatus;
  network?: CardNetwork;
  cardholderName: string;
  /** ALWAYS masked. This component has no code path that renders a full PAN. */
  last4: string;
  expiry?: string;
  /** Decorative background. Never put critical information only in here. */
  artwork?: React.ReactNode;
  aspectRatio?: number;
  contactless?: boolean;
  onPress?: () => void;
  /** Label override for the whole card, for screen readers. */
  accessibilityLabel?: string;
}

/**
 * The card as an information object, not a picture.
 *
 * Deliberate omission: there is no `showFullNumber` prop and no way to pass a
 * PAN. Credential reveal lives in `CardDetailsPanel`, behind authentication, so
 * decorative rendering can never accidentally become credential exposure.
 */
export const CardVisual = forwardRef<View, CardVisualProps>(function CardVisual(
  {
    variant = 'physical',
    status = 'active',
    network = 'unknown',
    cardholderName,
    last4,
    expiry,
    artwork,
    aspectRatio,
    contactless = true,
    onPress,
    animated = true,
    entering = 'scale',
    style,
    containerStyle,
    testID,
    accessibilityLabel,
  },
  ref,
) {
  const theme = useAppTheme();
  const fintech = useFintechTheme();
  const motion = useMotion({ animated });
  const { animatedStyle, onPressIn, onPressOut } = usePressAnimation({
    animation: onPress ? 'scale' : 'none',
    animated,
    scaleTo: 0.98,
  });

  const meta = STATUS_META[status];
  const ratio = aspectRatio ?? fintech.layout.cardAspectRatio;

  const background = useMemo(() => {
    if (status === 'frozen' || status === 'terminated') return fintech.colors.cardFrozen;
    switch (variant) {
      case 'virtual':
      case 'disposable':
        return fintech.colors.cardVirtual;
      case 'light':
        return theme.colors.surfaceVariant;
      default:
        return fintech.colors.cardPhysical;
    }
  }, [fintech.colors, status, theme.colors.surfaceVariant, variant]);

  const foreground = variant === 'light' ? theme.colors.onSurface : '#FFFFFF';

  /** The full text alternative: type, digits, status — never just "card image". */
  const label =
    accessibilityLabel ??
    `${variant} ${NETWORK_LABEL[network] || 'card'} ending ${last4.split('').join(' ')}, ${meta.label}`;

  const body = (
    <View style={[styles.face, { backgroundColor: background, borderRadius: theme.radii.lg, aspectRatio: ratio }]}>
      {artwork ? <View style={StyleSheet.absoluteFill}>{artwork}</View> : null}

      <View style={[styles.faceContent, { padding: theme.spacing.md }]}>
        <View style={styles.topRow}>
          <Text variant="labelSmall" style={{ color: foreground, opacity: 0.85 }}>
            {variant === 'virtual' ? 'Virtual card' : variant === 'disposable' ? 'Disposable card' : 'Physical card'}
          </Text>
          {contactless && status === 'active' ? (
            <Icon source="contactless-payment" size={theme.sizing.icon.md} color={foreground} />
          ) : null}
        </View>

        <View style={styles.flex} />

        <Text variant="titleMedium" style={[styles.number, { color: foreground }]}>
          •••• •••• •••• {last4}
        </Text>

        <View style={[styles.bottomRow, { marginTop: theme.spacing.sm }]}>
          <View style={styles.flex}>
            <Text variant="labelSmall" style={{ color: foreground, opacity: 0.75 }} numberOfLines={1}>
              {cardholderName.toUpperCase()}
            </Text>
            {expiry ? (
              <Text variant="labelSmall" style={{ color: foreground, opacity: 0.75 }}>
                Expires {expiry}
              </Text>
            ) : null}
          </View>
          {NETWORK_LABEL[network] ? (
            <Text variant="titleSmall" style={{ color: foreground }}>
              {NETWORK_LABEL[network]}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Blocking statuses get an overlay AND a label — not a colour change. */}
      {meta.blocking ? (
        <View
          style={[styles.overlay, { borderRadius: theme.radii.lg, backgroundColor: 'rgba(0,0,0,0.45)' }]}
          testID={childTestID(testID, 'status-overlay')}
        >
          <Icon source={meta.icon} size={32} color="#FFFFFF" />
          <Text variant="titleMedium" style={{ color: '#FFFFFF', marginTop: theme.spacing.xs }}>
            {meta.label}
          </Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <Animated.View
      ref={ref}
      entering={motion.entering(entering)}
      style={[containerStyle, animatedStyle, style]}
      accessible
      accessibilityRole={onPress ? 'button' : 'image'}
      accessibilityLabel={label}
      testID={testID}
    >
      {onPress ? (
        <TouchableRipple onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} borderless>
          {body}
        </TouchableRipple>
      ) : (
        body
      )}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  face: { overflow: 'hidden', width: '100%' },
  faceContent: { flex: 1 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bottomRow: { flexDirection: 'row', alignItems: 'flex-end' },
  number: { letterSpacing: 2, fontVariant: ['tabular-nums'] },
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
});
