/**
 * Label builders.
 *
 * Two rules run through every component in this library, and both are here so
 * they are applied the same way each time:
 *
 * 1. **Never state anything by colour alone.** A red chip and a green chip are
 *    the same chip to a colour-blind user and to a screen reader.
 * 2. **One control, one complete label.** A card that reads "Nike Air Max" and
 *    then, three tab stops later, "₹8,995" forces the user to assemble the
 *    sentence themselves.
 */

/** Joins the parts of a composite label, dropping the empty ones. */
export function describe(...parts: (string | number | false | null | undefined)[]): string {
  return parts
    .filter(
      (part): part is string | number =>
        part !== null && part !== undefined && part !== false && part !== '',
    )
    .join(', ');
}

/** Human wording for a live region. `polite` unless the user is blocked. */
export type Politeness = 'polite' | 'assertive';

export interface Announcement {
  readonly message: string;
  readonly politeness: Politeness;
}

export function announce(message: string, politeness: Politeness = 'polite'): Announcement {
  return { message, politeness };
}

/**
 * Relative time with the absolute value kept.
 *
 * "2 hours ago" is the readable form and "at 10:42" is the precise one; a
 * timestamp that only says "2 hours ago" cannot be reconciled with a receipt.
 */
export function timeLabel(iso: string, locale?: string, now = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;

  const seconds = Math.round((date.getTime() - now.getTime()) / 1000);
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const absolute = Math.abs(seconds);

  const relative =
    absolute < 60
      ? formatter.format(Math.round(seconds), 'second')
      : absolute < 3600
        ? formatter.format(Math.round(seconds / 60), 'minute')
        : absolute < 86400
          ? formatter.format(Math.round(seconds / 3600), 'hour')
          : formatter.format(Math.round(seconds / 86400), 'day');

  const exact = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(
    date,
  );
  return `${relative} (${exact})`;
}

/** `2026-08-06T16:30:00Z` → `4:30 PM`. */
export function clockLabel(iso: string, locale?: string, timeZone?: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(locale, { timeStyle: 'short', timeZone }).format(date);
}

/** `1234` → `1,234`. */
export function countLabel(value: number, locale?: string): string {
  return new Intl.NumberFormat(locale).format(value);
}

/**
 * "3 items" / "1 item" — the plural that every list header needs and that half
 * of them get wrong.
 */
export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${countLabel(count)} ${count === 1 ? singular : plural}`;
}
