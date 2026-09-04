import React, { forwardRef, useCallback, useMemo } from 'react';
import { View } from 'react-native';
import { TextInput as PaperTextInput } from 'react-native-paper';

import { useControllableState } from '@/hooks';
import { formatMinorUnits, parseMinorUnits } from '@/utils';

import { AppTextInput, type AppTextInputHandle, type AppTextInputProps } from '../atoms/AppTextInput';

export interface CurrencyInputProps
  extends Omit<AppTextInputProps, 'value' | 'defaultValue' | 'onChangeText' | 'onChange' | 'mask'> {
  /** ISO 4217 code — drives the symbol via `Intl`, never a hardcoded '₹'. */
  currency?: string;
  locale?: string;
  /** Decimal places. 2 for INR/USD, 0 for JPY. */
  precision?: number;
  allowNegative?: boolean;
  /** Amount in MINOR units (paise / cents). Never a float. */
  value?: number;
  defaultValue?: number;
  onChange?: (minorUnits: number) => void;
}

/**
 * Money is stored in minor units end-to-end. Floats are not allowed anywhere
 * near a currency amount, so the component's public value is an integer.
 */
export const CurrencyInput = forwardRef<AppTextInputHandle, CurrencyInputProps>(function CurrencyInput(
  {
    currency = 'INR',
    locale = 'en-IN',
    precision = 2,
    allowNegative = false,
    value,
    defaultValue = 0,
    onChange,
    testID,
    ...rest
  },
  ref,
) {
  const [minor, setMinor] = useControllableState<number>({ value, defaultValue, onChange });

  const display = useMemo(
    () => (minor === 0 ? '' : formatMinorUnits(minor, currency, locale, precision)),
    [currency, locale, minor, precision],
  );

  const handleChangeText = useCallback(
    (text: string) => setMinor(parseMinorUnits(text, precision, allowNegative)),
    [allowNegative, precision, setMinor],
  );

  const symbol = useMemo(() => {
    const formatted = formatMinorUnits(0, currency, locale, precision);
    return formatted.replace(/[\d.,\s]/g, '') || currency;
  }, [currency, locale, precision]);

  return (
    <AppTextInput
      {...rest}
      ref={ref}
      value={display}
      onChangeText={handleChangeText}
      keyboardType="number-pad"
      left={<PaperTextInput.Affix text={symbol} />}
      testID={testID}
    />
  );
});

/** Read-only money display — same formatting rules, no input affordance. */
export const CurrencyText = ({
  minor,
  currency = 'INR',
  locale = 'en-IN',
  precision = 2,
  children,
}: {
  minor: number;
  currency?: string;
  locale?: string;
  precision?: number;
  children: (formatted: string) => React.ReactNode;
}) => <View>{children(formatMinorUnits(minor, currency, locale, precision))}</View>;
