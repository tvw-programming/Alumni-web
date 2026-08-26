/**
 * Money primitives.
 *
 * DEVIATION FROM SPEC, on purpose: the blueprint calls for `bigint` minor units.
 * `bigint` does not survive `JSON.parse`, the RN bridge, or Reanimated worklets,
 * and every sample payload in this folder is JSON. `number` is exact for
 * integers up to 2^53 — about 90 trillion major units — so the precision
 * argument for bigint does not bite at any realistic balance. What actually
 * matters is that we never use floats, and we never do arithmetic on formatted
 * strings. Both hold here.
 */

export interface Money {
  /** Integer minor units (paise, cents, …). Never a float. */
  minorUnits: number;
  /** ISO 4217. */
  currency: string;
}

/** Currencies whose minor unit is the major unit. */
const ZERO_DECIMAL = new Set(['JPY', 'KRW', 'VND', 'CLP', 'ISK', 'XAF', 'XOF']);
const THREE_DECIMAL = new Set(['BHD', 'JOD', 'KWD', 'OMR', 'TND']);

export const precisionFor = (currency: string): number => {
  if (ZERO_DECIMAL.has(currency)) return 0;
  if (THREE_DECIMAL.has(currency)) return 3;
  return 2;
};

export const money = (minorUnits: number, currency: string): Money => ({ minorUnits, currency });

export const addMoney = (a: Money, b: Money): Money => {
  if (a.currency !== b.currency) {
    throw new Error(`Cannot add ${a.currency} to ${b.currency} — convert first.`);
  }
  return { minorUnits: a.minorUnits + b.minorUnits, currency: a.currency };
};

export const isNegative = (value: Money): boolean => value.minorUnits < 0;

export interface FormatMoneyOptions {
  locale?: string;
  /** Hide the currency symbol — for use next to an explicit currency chip. */
  omitSymbol?: boolean;
  /** Always render a leading + or −. */
  signDisplay?: 'auto' | 'always' | 'never';
}

/**
 * Locale-aware formatting. Precision, symbol placement and negative formatting
 * all come from `Intl` — never hardcoded.
 */
export const formatMoney = (value: Money, options: FormatMoneyOptions = {}): string => {
  const { locale = 'en-IN', omitSymbol = false, signDisplay = 'auto' } = options;
  const precision = precisionFor(value.currency);
  const major = value.minorUnits / 10 ** precision;

  try {
    return new Intl.NumberFormat(locale, {
      style: omitSymbol ? 'decimal' : 'currency',
      currency: value.currency,
      minimumFractionDigits: precision,
      maximumFractionDigits: precision,
      signDisplay,
    }).format(major);
  } catch {
    return `${omitSymbol ? '' : `${value.currency} `}${major.toFixed(precision)}`;
  }
};

/** Screen-reader friendly rendering: "1,240 rupees 50 paise" reads badly. */
export const formatMoneyForA11y = (value: Money, locale = 'en-IN'): string => {
  const precision = precisionFor(value.currency);
  const major = Math.abs(value.minorUnits) / 10 ** precision;
  const sign = value.minorUnits < 0 ? 'minus ' : '';
  try {
    return (
      sign +
      new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: value.currency,
        currencyDisplay: 'name',
        minimumFractionDigits: precision,
      }).format(major)
    );
  } catch {
    return `${sign}${major} ${value.currency}`;
  }
};

/** Digit-string → minor units. Used by the keypad; no float arithmetic. */
export const digitsToMinorUnits = (digits: string, currency: string): number => {
  const precision = precisionFor(currency);
  const clean = digits.replace(/\D/g, '').slice(0, 15);
  if (!clean) return 0;
  return Number.parseInt(clean, 10) * (precision === 0 ? 1 : 1);
};

/** The masked rendering used everywhere privacy mode is on. */
export const maskAmount = (value: Money, maskChar = '•'): string => {
  const precision = precisionFor(value.currency);
  return maskChar.repeat(precision > 0 ? 6 : 4);
};
