import { precisionFor } from '../types/money';

/**
 * Amount-entry logic, kept entirely out of the component.
 *
 * The model is a digit buffer interpreted as MINOR units — type "1", "2", "5"
 * and you get ₹1.25. This is the only approach that avoids floating point, and
 * it makes cursor position irrelevant because there is no free-text cursor.
 */

export type AmountError =
  | 'belowMinimum'
  | 'aboveMaximum'
  | 'aboveBalance'
  | 'aboveLimit'
  | 'zeroAmount'
  | 'invalid';

export interface AmountInputState {
  /** Integer minor units. See `types/money.ts` for the bigint deviation note. */
  minorUnits: number;
  currency: string;
  formattedValue: string;
  isValid: boolean;
  error?: AmountError;
}

export interface AmountConstraints {
  min?: number;
  max?: number;
  /** Available balance in minor units. */
  availableBalance?: number;
  /** Per-transaction or daily cap in minor units. */
  limit?: number;
  allowZero?: boolean;
  allowNegative?: boolean;
}

const MAX_DIGITS = 12;

/** Appends a digit to the buffer, respecting the currency's precision. */
export const appendDigit = (digits: string, digit: string, currency: string): string => {
  if (!/^\d$/.test(digit)) return digits;
  const next = `${digits}${digit}`.replace(/^0+(?=\d)/, '');
  const cap = MAX_DIGITS + precisionFor(currency);
  return next.slice(0, cap);
};

export const removeDigit = (digits: string): string => digits.slice(0, -1);

export const digitsFromMinorUnits = (minorUnits: number): string =>
  minorUnits === 0 ? '' : String(Math.abs(Math.trunc(minorUnits)));

export const minorUnitsFromDigits = (digits: string): number =>
  digits ? Number.parseInt(digits, 10) : 0;

/**
 * Paste handling: accepts a formatted major-unit string ("1,234.50") and
 * converts it without ever calling parseFloat on user input.
 */
export const digitsFromPastedText = (text: string, currency: string): string => {
  const precision = precisionFor(currency);
  const cleaned = text.replace(/[^\d.,-]/g, '');
  const normalized = cleaned.replace(/,/g, '.');
  const lastDot = normalized.lastIndexOf('.');

  if (lastDot === -1 || precision === 0) return normalized.replace(/\D/g, '').slice(0, MAX_DIGITS);

  const whole = normalized.slice(0, lastDot).replace(/\D/g, '');
  const fraction = normalized
    .slice(lastDot + 1)
    .replace(/\D/g, '')
    .padEnd(precision, '0')
    .slice(0, precision);
  return `${whole}${fraction}`.replace(/^0+(?=\d)/, '').slice(0, MAX_DIGITS + precision);
};

export const validateAmount = (
  minorUnits: number,
  constraints: AmountConstraints,
): { isValid: boolean; error?: AmountError } => {
  const { min, max, availableBalance, limit, allowZero = false, allowNegative = false } = constraints;

  if (!Number.isFinite(minorUnits)) return { isValid: false, error: 'invalid' };
  if (minorUnits < 0 && !allowNegative) return { isValid: false, error: 'invalid' };
  if (minorUnits === 0) return allowZero ? { isValid: true } : { isValid: false, error: 'zeroAmount' };
  if (min != null && minorUnits < min) return { isValid: false, error: 'belowMinimum' };
  if (max != null && minorUnits > max) return { isValid: false, error: 'aboveMaximum' };
  if (limit != null && minorUnits > limit) return { isValid: false, error: 'aboveLimit' };
  if (availableBalance != null && minorUnits > availableBalance) {
    return { isValid: false, error: 'aboveBalance' };
  }
  return { isValid: true };
};

/** Locale decimal separator, derived rather than assumed. */
export const decimalSeparatorFor = (locale: string): string =>
  new Intl.NumberFormat(locale).formatToParts(1.1).find((part) => part.type === 'decimal')?.value ?? '.';
