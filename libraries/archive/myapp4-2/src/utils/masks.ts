/**
 * Input masks as pure functions. Keeping them out of the component means they
 * are unit-testable and swappable per locale.
 */
export type MaskName = 'phone' | 'card' | 'date' | 'cvv' | 'none';

export interface Mask {
  format: (raw: string) => string;
  /** Strips presentation characters back to the value the app should store. */
  unformat: (masked: string) => string;
  keyboardType: 'default' | 'number-pad' | 'phone-pad';
  maxLength?: number;
}

const digitsOnly = (value: string) => value.replace(/\D/g, '');

const group = (value: string, sizes: number[], separator: string): string => {
  const parts: string[] = [];
  let cursor = 0;
  for (const size of sizes) {
    if (cursor >= value.length) break;
    parts.push(value.slice(cursor, cursor + size));
    cursor += size;
  }
  if (cursor < value.length) parts.push(value.slice(cursor));
  return parts.join(separator);
};

export const MASKS: Record<MaskName, Mask> = {
  none: { format: (v) => v, unformat: (v) => v, keyboardType: 'default' },
  phone: {
    format: (raw) => {
      const d = digitsOnly(raw).slice(0, 10);
      if (d.length <= 5) return d;
      return `${d.slice(0, 5)} ${d.slice(5)}`;
    },
    unformat: digitsOnly,
    keyboardType: 'phone-pad',
    maxLength: 11,
  },
  card: {
    format: (raw) => group(digitsOnly(raw).slice(0, 16), [4, 4, 4, 4], ' '),
    unformat: digitsOnly,
    keyboardType: 'number-pad',
    maxLength: 19,
  },
  date: {
    format: (raw) => group(digitsOnly(raw).slice(0, 8), [2, 2, 4], '/'),
    unformat: digitsOnly,
    keyboardType: 'number-pad',
    maxLength: 10,
  },
  cvv: {
    format: (raw) => digitsOnly(raw).slice(0, 4),
    unformat: digitsOnly,
    keyboardType: 'number-pad',
    maxLength: 4,
  },
};

export interface Country {
  code: string;
  dial: string;
  name: string;
  flag: string;
  nationalLength: number;
}

export const COUNTRIES: Country[] = [
  { code: 'IN', dial: '+91', name: 'India', flag: '🇮🇳', nationalLength: 10 },
  { code: 'US', dial: '+1', name: 'United States', flag: '🇺🇸', nationalLength: 10 },
  { code: 'GB', dial: '+44', name: 'United Kingdom', flag: '🇬🇧', nationalLength: 10 },
  { code: 'AE', dial: '+971', name: 'United Arab Emirates', flag: '🇦🇪', nationalLength: 9 },
  { code: 'SG', dial: '+65', name: 'Singapore', flag: '🇸🇬', nationalLength: 8 },
  { code: 'DE', dial: '+49', name: 'Germany', flag: '🇩🇪', nationalLength: 11 },
];

export const toE164 = (dial: string, national: string): string =>
  `${dial}${national.replace(/\D/g, '')}`;
