import React, { forwardRef, useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Icon, Text } from 'react-native-paper';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { AppButton } from '@ui/atoms/AppButton';
import { AppSheet } from '@ui/organisms/AppSheet';
import { useMotion, useShake, type AnimatableProps } from '@/hooks';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { Keypad, type KeypadKey } from '../primitives/Keypad';
import { useFintechTheme } from '../theme/fintechTokens';
import { formatMoney, type Money } from '../types/money';
import type { AuthState } from '../types/domain';

export type BiometricKind = 'faceId' | 'touchId' | 'fingerprint' | 'none';

/**
 * Apple's HIG is explicit: name the method ("Sign in with Face ID"), do not say
 * "use biometrics". Android's equivalents get the same treatment.
 */
const BIOMETRIC_COPY: Record<BiometricKind, { label: string; icon: string }> = {
  faceId: { label: 'Confirm with Face ID', icon: 'face-recognition' },
  touchId: { label: 'Confirm with Touch ID', icon: 'fingerprint' },
  fingerprint: { label: 'Confirm with fingerprint', icon: 'fingerprint' },
  none: { label: 'Confirm', icon: 'lock-outline' },
};

export interface TransactionContext {
  amount?: Money;
  recipientName?: string;
  /** "Confirm this transfer" beats "Enter PIN" — say what is being authorised. */
  purpose: string;
}

export interface PinPadProps extends StyleEscapeHatches, Pick<AnimatableProps, 'animated'> {
  visible: boolean;
  state: AuthState;
  transactionContext: TransactionContext;
  /** Which methods this device/session actually supports. */
  methods?: BiometricKind[];
  preferredMethod?: BiometricKind;
  pinLength?: number;
  attemptsRemaining?: number;
  /** ISO timestamp; while in the future the pad stays locked. */
  lockoutUntil?: string;
  errorMessage?: string;
  locale?: string;
  /** Shuffle the digits. Off by default — it hurts everyone's muscle memory. */
  randomizeKeypad?: boolean;
  onAuthenticate: (pin: string) => void;
  onBiometric?: () => void;
  onFallback?: () => void;
  onCancel: () => void;
  onRecover?: () => void;
}

/**
 * PIN + biometric confirmation surface.
 *
 * Deliberately dumb: it never decides whether a PIN is correct, never stores
 * one, and never logs one. It renders an `AuthState` and emits attempts. The
 * biometric prompt itself stays native — this component only renders the
 * surrounding explanation and fallbacks.
 */
export const PinPad = forwardRef<View, PinPadProps>(function PinPad(
  {
    visible,
    state,
    transactionContext,
    methods = ['none'],
    preferredMethod,
    pinLength = 6,
    attemptsRemaining,
    lockoutUntil,
    errorMessage,
    locale = 'en-IN',
    randomizeKeypad = false,
    onAuthenticate,
    onBiometric,
    onFallback,
    onCancel,
    onRecover,
    animated = true,
    style,
    containerStyle,
    testID,
  },
  ref,
) {
  const theme = useAppTheme();
  const fintech = useFintechTheme();
  const motion = useMotion({ animated });
  const { style: shakeStyle, shake } = useShake(animated);
  const [pin, setPin] = useState('');

  const biometric = preferredMethod ?? methods.find((m) => m !== 'none') ?? 'none';
  const hasBiometric = biometric !== 'none' && !!onBiometric;

  const locked = state === 'locked' || (!!lockoutUntil && new Date(lockoutUntil) > new Date());
  const busy = state === 'verifying';

  // Clear the buffer whenever we leave entry — never leave a PIN in memory.
  useEffect(() => {
    if (state !== 'pinEntry') setPin('');
  }, [state]);

  useEffect(() => {
    if (state === 'failure') {
      shake();
      setPin('');
    }
  }, [shake, state]);

  const handleKey = useCallback(
    (key: KeypadKey) => {
      if (locked || busy) return;
      if (key.kind === 'digit') {
        setPin((prev) => {
          const next = `${prev}${key.value}`.slice(0, pinLength);
          if (next.length === pinLength) onAuthenticate(next);
          return next;
        });
      } else if (key.kind === 'backspace') {
        setPin((prev) => prev.slice(0, -1));
      } else if (key.kind === 'custom' && key.value === 'biometric') {
        onBiometric?.();
      }
    },
    [busy, locked, onAuthenticate, onBiometric, pinLength],
  );

  const leadingKey = useMemo<KeypadKey | undefined>(
    () =>
      hasBiometric
        ? { kind: 'custom', value: 'biometric', icon: BIOMETRIC_COPY[biometric].icon, label: BIOMETRIC_COPY[biometric].label }
        : undefined,
    [biometric, hasBiometric],
  );

  const lockoutCopy = lockoutUntil
    ? `Try again after ${new Date(lockoutUntil).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}`
    : 'Too many attempts';

  return (
    <AppSheet
      visible={visible}
      onDismiss={onCancel}
      variant="fullscreen"
      dismissible={!busy}
      enableBackdropPress={false}
      animated={animated}
      containerStyle={containerStyle}
      style={style}
      testID={testID}
    >
      <View ref={ref} style={styles.root}>
        {/* What is being authorised, above the control — never a bare "Enter PIN". */}
        <View style={[styles.context, { gap: theme.spacing.xs }]}>
          <Text variant="titleLarge" style={styles.center}>
            {transactionContext.purpose}
          </Text>
          {transactionContext.amount ? (
            <Text variant="headlineMedium" style={[styles.center, styles.tabular]}>
              {formatMoney(transactionContext.amount, { locale })}
            </Text>
          ) : null}
          {transactionContext.recipientName ? (
            <Text variant="bodyMedium" style={[styles.center, { color: theme.colors.onSurfaceVariant }]}>
              to {transactionContext.recipientName}
            </Text>
          ) : null}
        </View>

        {state === 'success' ? (
          <Animated.View entering={motion.enabled ? FadeIn : undefined} style={styles.center}>
            <Icon source="check-circle" size={56} color={fintech.colors.statusSuccess} />
            {/* Local success is not payment success — say so. */}
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: theme.spacing.sm }}>
              Verified. Submitting your payment…
            </Text>
          </Animated.View>
        ) : (
          <>
            <Animated.View
              style={[styles.dots, { gap: theme.spacing.md }, shakeStyle]}
              accessibilityRole="text"
              accessibilityLabel={`${pin.length} of ${pinLength} digits entered`}
              accessibilityLiveRegion="polite"
              testID={childTestID(testID, 'dots')}
            >
              {Array.from({ length: pinLength }).map((_, i) => (
                <PinDot
                  key={i}
                  filled={i < pin.length}
                  error={state === 'failure'}
                  animated={animated}
                />
              ))}
            </Animated.View>

            <View style={styles.messageRow}>
              {busy ? (
                <ActivityIndicator testID={childTestID(testID, 'verifying')} />
              ) : locked ? (
                <Text variant="bodyMedium" style={{ color: fintech.colors.statusError }}>
                  {lockoutCopy}
                </Text>
              ) : errorMessage ? (
                // Never reveals which digit was wrong.
                <Text variant="bodyMedium" style={{ color: fintech.colors.statusError }} testID={childTestID(testID, 'error')}>
                  {errorMessage}
                  {attemptsRemaining != null ? ` · ${attemptsRemaining} attempts left` : ''}
                </Text>
              ) : null}
            </View>

            <Keypad
              onKeyPress={handleKey}
              onClear={() => setPin('')}
              leadingKey={leadingKey}
              disabled={locked || busy}
              randomize={randomizeKeypad}
              testID={childTestID(testID, 'keypad')}
            />
          </>
        )}

        <View style={[styles.footer, { padding: theme.spacing.md, gap: theme.spacing.sm }]}>
          {locked && onRecover ? (
            <AppButton variant="secondary" fullWidth onPress={onRecover} testID={childTestID(testID, 'recover')}>
              Reset your PIN
            </AppButton>
          ) : hasBiometric && state !== 'success' ? (
            <AppButton
              variant="secondary"
              fullWidth
              icon={BIOMETRIC_COPY[biometric].icon}
              onPress={onBiometric}
              disabled={locked || busy}
              testID={childTestID(testID, 'biometric')}
            >
              {BIOMETRIC_COPY[biometric].label}
            </AppButton>
          ) : onFallback ? (
            <AppButton variant="ghost" fullWidth onPress={onFallback} testID={childTestID(testID, 'fallback')}>
              Use device passcode
            </AppButton>
          ) : null}

          <AppButton variant="ghost" fullWidth onPress={onCancel} disabled={busy} testID={childTestID(testID, 'cancel')}>
            Cancel
          </AppButton>
        </View>
      </View>
    </AppSheet>
  );
});

const PinDot = ({ filled, error, animated }: { filled: boolean; error: boolean; animated: boolean }) => {
  const theme = useAppTheme();
  const fintech = useFintechTheme();
  const motion = useMotion({ animated });
  const scale = useSharedValue(filled ? 1 : 0.6);

  useEffect(() => {
    const target = filled ? 1 : 0.6;
    scale.value = motion.enabled ? withSpring(target, theme.motion.spring.bouncy) : target;
  }, [filled, motion.enabled, scale, theme.motion.spring.bouncy]);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View
      style={[
        style,
        styles.dot,
        {
          borderRadius: theme.radii.pill,
          backgroundColor: filled ? (error ? fintech.colors.statusError : theme.colors.primary) : 'transparent',
          borderColor: error ? fintech.colors.statusError : theme.colors.outline,
        },
      ]}
    />
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'space-between' },
  context: { paddingHorizontal: 24, paddingTop: 24 },
  center: { textAlign: 'center', alignItems: 'center' },
  tabular: { fontVariant: ['tabular-nums'] },
  dots: { flexDirection: 'row', justifyContent: 'center', paddingVertical: 24 },
  dot: { width: 16, height: 16, borderWidth: 1.5 },
  messageRow: { minHeight: 32, alignItems: 'center', justifyContent: 'center' },
  footer: {},
});
