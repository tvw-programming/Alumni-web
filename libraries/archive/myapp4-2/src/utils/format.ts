/**
 * Formatting lives outside components. `CurrencyInput` receives a locale and a
 * currency, not a pre-formatted string, and never bakes in a symbol.
 */

/** Currency is stored in MINOR units (paise/cents) everywhere in the app. */
export const formatMinorUnits = (
  minor: number,
  currency: string,
  locale: string,
  precision = 2,
): string => {
  const major = minor / 10 ** precision;
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: precision,
      maximumFractionDigits: precision,
    }).format(major);
  } catch {
    return `${currency} ${major.toFixed(precision)}`;
  }
};

export const parseMinorUnits = (text: string, precision = 2, allowNegative = false): number => {
  const negative = allowNegative && /-/.test(text);
  const digits = text.replace(/\D/g, '');
  if (!digits) return 0;
  const value = Number.parseInt(digits.slice(0, 15), 10);
  return negative ? -value : value;
};

export const formatRelativeDate = (iso: string, locale = 'en-US'): string => {
  const date = new Date(iso);
  const diffDays = Math.round((date.getTime() - Date.now()) / 86_400_000);
  if (Math.abs(diffDays) < 30) {
    return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(diffDays, 'day');
  }
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date);
};

export const formatDate = (value: Date | null, locale = 'en-US'): string =>
  value ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(value) : '';

export const initialsOf = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
