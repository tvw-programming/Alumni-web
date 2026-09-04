import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Chip, HelperText, Text } from 'react-native-paper';
import Animated from 'react-native-reanimated';

import { AppButton } from '@ui/atoms/AppButton';
import { useControllableState, useShake, type AnimatableProps } from '@/hooks';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { Keypad, type KeypadKey } from '../primitives/Keypad';
import { useFintechTheme } from '../theme/fintechTokens';
import { formatMoney, formatMoneyForA11y, precisionFor, type Money } from '../types/money';
import {
  appendDigit,
  decimalSeparatorFor,
  digitsFromMinorUnits,
  digitsFromPastedText,
  minorUnitsFromDigits,
  removeDigit,
  validateAmount,
  type AmountConstraints,
  type AmountError,
  type AmountInputState,
} from './amountEntry';

const ERROR_COPY: Record<AmountError, string> = {
  belowMinimum: 'That is below the minimum amount',
  aboveMaximum: 'That is above the maximum amount',
  aboveBalance: 'That is more than your available balance',
  aboveLimit: 'That is above your transfer limit',
  zeroAmount: 'Enter an amount',
  invalid: 'Enter a valid amount',
};

export interface AmountKeypadProps extends StyleEscapeHatches, Pick<AnimatableProps, 'animated'>, AmountConstraints {
  currency: string;
  locale?: string;
  /** Controlled amount in minor units. */
  value?: number;
  defaultValue?: number;
  onChange?: (state: AmountInputState) => void;
  onSubmit?: (state: AmountInputState) => void;
  submitLabel?: string;
  submitting?: boolean;
  /** Recipient / purpose context rendered above the amount. */
  context?: React.ReactNode;
  /** Tappable presets in minor units. */
  quickAmounts?: number[];
  /** Live fee or delivery information, recalculated by the caller. */
  footnote?: string;
  disabled?: boolean;
}

export interface AmountKeypadHandle {
  clear: () => void;
  shake: () => void;
  paste: (text: string) => void;
}

/**
 * Focused amount entry: display, keypad, primary action.
 *
 * All arithmetic lives in `amountEntry.ts`; this file only renders state and
 * emits intent. Currencies with zero minor units (JPY) and three (KWD) are
 * handled by `precisionFor`, not by branching in the UI.
 */
export const AmountKeypad = forwardRef<AmountKeypadHandle, AmountKeypadProps>(function AmountKeypad(
  {
    currency,
    locale = 'en-IN',
    value,
    defaultValue = 0,
    onChange,
    onSubmit,
    submitLabel = 'Continue',
    submitting = false,
    context,
    quickAmounts = [],
    footnote,
    disabled = false,
    animated = true,
    min,
    max,
    availableBalance,
    limit,
    allowZero,
    allowNegative,
    style,
    containerStyle,
    testID,
  },
  ref,
) {
  const theme = useAppTheme();
  const fintech = useFintechTheme();
  const { style: shakeStyle, shake } = useShake(animated);

  const [minorUnits, setMinorUnits] = useControllableState<number>({
    value,
    defaultValue,
    onChange: undefined,
  });
  const [digits, setDigits] = useState<string>(() => digitsFromMinorUnits(defaultValue));
  // Errors appear only after a submit attempt — not while the user is mid-entry.
  const [touched, setTouched] = useState(false);

  const constraints = useMemo<AmountConstraints>(
    () => ({ min, max, availableBalance, limit, allowZero, allowNegative }),
    [allowNegative, allowZero, availableBalance, limit, max, min],
  );

  const state = useMemo<AmountInputState>(() => {
    const validation = validateAmount(minorUnits, constraints);
    return {
      minorUnits,
      currency,
      formattedValue: formatMoney({ minorUnits, currency }, { locale }),
      isValid: validation.isValid,
      error: validation.error,
    };
  }, [constraints, currency, locale, minorUnits]);

  useEffect(() => {
    onChange?.(state);
    // Emitting on every keystroke is the point; `onChange` identity is not.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.minorUnits, state.isValid]);

  const commit = useCallback(
    (nextDigits: string) => {
      setDigits(nextDigits);
      setMinorUnits(minorUnitsFromDigits(nextDigits));
    },
    [setMinorUnits],
  );

  useImperativeHandle(
    ref,
    () => ({
      clear: () => commit(''),
      shake,
      paste: (text: string) => commit(digitsFromPastedText(text, currency)),
    }),
    [commit, currency, shake],
  );

  const handleKey = useCallback(
    (key: KeypadKey) => {
      if (disabled) return;
      if (key.kind === 'digit') commit(appendDigit(digits, key.value, currency));
      else if (key.kind === 'backspace') commit(removeDigit(digits));
      // The decimal key is presentational only: the buffer is already in minor
      // units, so there is nothing to insert. Pressing it is a no-op by design.
    },
    [commit, currency, digits, disabled],
  );

  const handleSubmit = useCallback(() => {
    setTouched(true);
    if (!state.isValid) {
      shake();
      return;
    }
    onSubmit?.(state);
  }, [onSubmit, shake, state]);

  const showError = touched && !!state.error;
  const separator = precisionFor(currency) > 0 ? decimalSeparatorFor(locale) : undefined;

  return (
    <View style={[styles.root, containerStyle]} testID={testID}>
      {context ? <View style={{ marginBottom: theme.spacing.sm }}>{context}</View> : null}

      <Animated.View
        style={[styles.display, { minHeight: fintech.layout.amountDisplayHeight }, shakeStyle, style]}
        accessibilityRole="text"
        accessibilityLabel={`Amount ${formatMoneyForA11y({ minorUnits, currency }, locale)}`}
        accessibilityLiveRegion="polite"
        testID={childTestID(testID, 'display')}
      >
        <Text
          variant="displayMedium"
          style={[
            styles.amount,
            { color: minorUnits === 0 ? theme.colors.outline : showError ? fintech.colors.statusError : fintech.colors.amountDebit },
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {state.formattedValue}
        </Text>

        {/* Reserved row: the error must not push the keypad down. */}
        <View style={styles.helperRow}>
          {showError ? (
            <HelperText type="error" visible padding="none" testID={childTestID(testID, 'error')}>
              {ERROR_COPY[state.error as AmountError]}
            </HelperText>
          ) : footnote ? (
            <HelperText type="info" visible padding="none" testID={childTestID(testID, 'footnote')}>
              {footnote}
            </HelperText>
          ) : null}
        </View>
      </Animated.View>

      {quickAmounts.length > 0 && (
        <View style={[styles.quick, { gap: theme.spacing.sm, marginBottom: theme.spacing.sm }]}>
          {quickAmounts.map((preset) => (
            <Chip
              key={preset}
              onPress={() => commit(digitsFromMinorUnits(preset))}
              disabled={disabled}
              accessibilityLabel={`Set amount to ${formatMoneyForA11y({ minorUnits: preset, currency }, locale)}`}
              testID={childTestID(testID, `quick-${preset}`)}
            >
              {formatMoney({ minorUnits: preset, currency }, { locale })}
            </Chip>
          ))}
        </View>
      )}

      <Keypad
        onKeyPress={handleKey}
        onClear={() => commit('')}
        decimalSeparator={separator}
        disabled={disabled}
        testID={childTestID(testID, 'keypad')}
      />

      <View style={{ padding: theme.spacing.md }}>
        <AppButton
          variant="primary"
          size="lg"
          fullWidth
          loading={submitting}
          // Double-tapped payment buttons are a real production bug.
          debounceMs={1200}
          disabled={disabled}
          onPress={handleSubmit}
          animated={animated}
          testID={childTestID(testID, 'submit')}
        >
          {submitLabel}
        </AppButton>
      </View>
    </View>
  );
});

/** Convenience for callers that only need the resulting Money object. */
export const amountToMoney = (state: AmountInputState): Money => ({
  minorUnits: state.minorUnits,
  currency: state.currency,
});

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  display: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  amount: { fontVariant: ['tabular-nums'], textAlign: 'center' },
  helperRow: { minHeight: 22, justifyContent: 'center' },
  quick: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
});
