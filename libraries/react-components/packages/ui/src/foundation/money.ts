/**
 * Money, as minor units and a currency — never a floating-point number.
 *
 * `0.1 + 0.2 !== 0.3` in every IEEE-754 language, and a total that drifts by a
 * cent is a total that is wrong. Amounts are held as `bigint` minor units
 * (paise, cents) so arithmetic is exact and unbounded.
 *
 * JSON cannot carry a `bigint`, so the wire format is `SerializedMoney` with the
 * amount as a string. Every sample file in this library uses that shape, and
 * `parseMoney` is the only way in.
 */

export interface Money {
  readonly amountMinor: bigint;
  readonly currency: string;
}

/** What crosses the network or sits in a `.json` file. */
export interface SerializedMoney {
  readonly amountMinor: string;
  readonly currency: string;
}

export function money(amountMinor: bigint | number | string, currency: string): Money {
  return { amountMinor: BigInt(amountMinor), currency };
}

export function parseMoney(value: SerializedMoney): Money {
  return { amountMinor: BigInt(value.amountMinor), currency: value.currency };
}

export function serializeMoney(value: Money): SerializedMoney {
  return { amountMinor: value.amountMinor.toString(), currency: value.currency };
}

/** Guards against adding rupees to dollars, which no type alone prevents. */
function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new Error(`Cannot combine ${a.currency} with ${b.currency}`);
  }
}

export function addMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return { amountMinor: a.amountMinor + b.amountMinor, currency: a.currency };
}

export function subtractMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return { amountMinor: a.amountMinor - b.amountMinor, currency: a.currency };
}

/**
 * Multiplies by a whole quantity.
 *
 * Deliberately `bigint` only: a fractional multiplier would reintroduce the
 * rounding question this module exists to avoid. Percentage work (tax, tips)
 * belongs in a pricing service that states its rounding rule.
 */
export function multiplyMoney(value: Money, quantity: bigint | number): Money {
  return { amountMinor: value.amountMinor * BigInt(quantity), currency: value.currency };
}

export function isZeroMoney(value: Money): boolean {
  return value.amountMinor === 0n;
}

export function isNegativeMoney(value: Money): boolean {
  return value.amountMinor < 0n;
}

const FRACTION_DIGITS: Record<string, number> = {
  JPY: 0,
  KRW: 0,
  VND: 0,
};

function fractionDigits(currency: string): number {
  return FRACTION_DIGITS[currency] ?? 2;
}

/**
 * Formats for display.
 *
 * The division happens on `bigint`, so a large amount cannot lose precision on
 * its way to the string; only the final, already-rounded value becomes a
 * `Number` for `Intl`.
 */
export function formatMoney(value: Money, locale?: string): string {
  const digits = fractionDigits(value.currency);
  const divisor = 10 ** digits;
  const negative = value.amountMinor < 0n;
  const absolute = negative ? -value.amountMinor : value.amountMinor;

  const whole = absolute / BigInt(divisor);
  const fraction = absolute % BigInt(divisor);
  const asNumber = Number(whole) + Number(fraction) / divisor;

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: value.currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(negative ? -asNumber : asNumber);
}

/**
 * A screen-reader phrase for a money row.
 *
 * "Discount, minus 100 rupees" reads correctly; "Discount -₹100" is announced
 * as "Discount hyphen one hundred" by several screen readers.
 */
export function moneyLabel(label: string, value: Money, locale?: string): string {
  const formatted = formatMoney(
    {
      amountMinor: value.amountMinor < 0n ? -value.amountMinor : value.amountMinor,
      currency: value.currency,
    },
    locale,
  );
  return value.amountMinor < 0n ? `${label}, minus ${formatted}` : `${label}, ${formatted}`;
}
