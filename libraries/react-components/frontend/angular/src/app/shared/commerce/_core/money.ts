/**
 * Locale-aware money formatting, in one place.
 *
 * The brief's instruction — "centralize formatting through locale-aware currency
 * utilities" and "do not calculate discount percentages independently in each
 * product surface" — is enforced here by giving components no other way to turn
 * a `Money` into text.
 *
 * `Intl.NumberFormat` is constructed once per locale/currency pair and cached.
 * Building one is expensive enough that doing it per cell in a 50-row cart is
 * measurable, and the object is immutable, so sharing is safe.
 */
import { Money } from './commerce.types';

const formatters = new Map<string, Intl.NumberFormat>();

/**
 * Minor units per major unit. Most currencies are 100; the exceptions are real
 * and getting them wrong misplaces the decimal point by two orders of magnitude.
 */
const MINOR_UNITS: Readonly<Record<string, number>> = {
  JPY: 1,
  KRW: 1,
  VND: 1,
  BHD: 1000,
  KWD: 1000,
  OMR: 1000,
  TND: 1000,
};

export function minorUnitsPer(currency: string): number {
  return MINOR_UNITS[currency.toUpperCase()] ?? 100;
}

export function formatMoney(money: Money, locale = 'en-IN'): string {
  const key = `${locale}:${money.currency}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: money.currency,
      // Trailing ".00" on every price is noise in a dense grid, but a price
      // with real paise must not be silently rounded away.
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
    formatters.set(key, formatter);
  }
  return formatter.format(money.amountMinor / minorUnitsPer(money.currency));
}

/** True when both sides are the same currency — the only case where arithmetic
 *  or comparison between them means anything. */
export function sameCurrency(a: Money, b: Money): boolean {
  return a.currency.toUpperCase() === b.currency.toUpperCase();
}

export function subtractMoney(a: Money, b: Money): Money {
  if (!sameCurrency(a, b)) {
    throw new Error(`Cannot subtract ${b.currency} from ${a.currency}`);
  }
  return { amountMinor: a.amountMinor - b.amountMinor, currency: a.currency };
}

/**
 * Discount percentage from a pair of prices.
 *
 * Rounded down, never up: showing "50% off" for 49.6% is a claim the checkout
 * total will contradict. Returns null rather than 0 when there is nothing to
 * show, so a template can distinguish "no discount" from "a discount of zero".
 */
export function discountPercent(selling: Money, compareAt?: Money): number | null {
  if (!compareAt || !sameCurrency(selling, compareAt)) return null;
  if (compareAt.amountMinor <= selling.amountMinor) return null;

  const off = compareAt.amountMinor - selling.amountMinor;
  const percent = Math.floor((off / compareAt.amountMinor) * 100);
  // Below 1% the honest rendering is the saved amount, not "0% off".
  return percent >= 1 ? percent : null;
}

/**
 * The sentence a screen reader should hear for a discounted price.
 *
 * Built here rather than in each template because the brief asks for exactly
 * one phrasing — "Sale price 1,499 rupees, original price 2,499 rupees, 40
 * percent off" — and a sighted user reading a strikethrough gets that meaning
 * from layout alone.
 */
export function priceAnnouncement(
  selling: Money,
  compareAt: Money | undefined,
  locale = 'en-IN',
): string {
  const now = formatMoney(selling, locale);
  const percent = discountPercent(selling, compareAt);
  if (!compareAt || percent === null) return now;
  return `Sale price ${now}, original price ${formatMoney(compareAt, locale)}, ${percent} percent off`;
}
