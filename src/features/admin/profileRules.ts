/**
 * The two rules that govern an alumni record: what must be present before it
 * can be saved, and how complete it is once it is.
 *
 * One module because the grid, the add/edit dialog and the Excel importer all
 * need the same answers, and three copies of a percentage drift apart the first
 * time someone adds a field.
 */
import type { AlumniDraft } from '~/api/alumni';

/**
 * Nothing is saved without these three. They are the fields every later view
 * assumes: the directory sorts on the year, the profile card names the course,
 * and a record with no name is unfindable.
 */
export const MANDATORY = ['fullName', 'yearOfPassing', 'course'] as const;

/**
 * Completion weights, in percent. They total 100 and the split is deliberate:
 * the three mandatory fields carry 60, so a record that has only what it must
 * have reads as more than half done, and mobile carries 10 — which is what
 * makes a mandatory-plus-mobile record land on exactly 70%.
 *
 * Change a weight and the assertion below fails, which is the point: the 70
 * is a specified number, not an emergent one.
 */
export const WEIGHTS: Record<string, number> = {
  fullName: 20,
  yearOfPassing: 20,
  course: 20,
  mobile: 10,
  email: 10,
  city: 10,
  headline: 10,
};

/** The figure the spec names, kept next to the weights it depends on. */
export const MANDATORY_PLUS_MOBILE = 70;

const total = Object.values(WEIGHTS).reduce((sum, w) => sum + w, 0);
if (total !== 100) {
  throw new Error(`profile completion weights total ${total}, not 100`);
}
const baseline = MANDATORY.reduce((sum, f) => sum + WEIGHTS[f], 0) + WEIGHTS.mobile;
if (baseline !== MANDATORY_PLUS_MOBILE) {
  throw new Error(`mandatory fields plus mobile total ${baseline}%, not ${MANDATORY_PLUS_MOBILE}%`);
}

/**
 * Indian mobile numbers.
 *
 * Ten digits beginning 6, 7, 8 or 9 — the TRAI mobile series. Landlines, short
 * codes and foreign numbers are refused, because every use this field has
 * (SMS, WhatsApp, a call from the alumni office) assumes a mobile.
 *
 * The accepted *input* is generous — +91, 91, a leading 0, spaces, hyphens, all
 * the ways a person writes their own number — while what gets stored is one
 * canonical form. Rejecting "98765 43210" because of the space would teach
 * staff to distrust the field.
 */
const INDIAN_MOBILE = /^(?:\+?91[\s-]?|0)?[6-9]\d{9}$/;

export function isIndianMobile(raw: string): boolean {
  return INDIAN_MOBILE.test(raw.replace(/[\s-]/g, '').trim());
}

/**
 * `+91XXXXXXXXXX`, matching the CHECK constraint in
 * db/migrations/000003_alumni_extra.up.sql. Two people who typed the same
 * number differently must compare equal, or a duplicate report is useless.
 */
export function normaliseMobile(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 10) return raw.trim();
  return `+91${digits.slice(-10)}`;
}

function filled(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number') return !Number.isNaN(value);
  return true;
}

/** 0-100, rounded. Only weighted fields count. */
export function completionPercent(record: Partial<AlumniDraft>): number {
  const earned = Object.entries(WEIGHTS).reduce(
    (sum, [field, weight]) => (filled(record[field as keyof AlumniDraft]) ? sum + weight : sum),
    0,
  );
  return Math.round(earned);
}

export interface FieldErrors {
  [field: string]: string;
}

const CURRENT_YEAR = new Date().getFullYear();

/**
 * Errors keyed by field, empty when the record may be saved.
 *
 * Returns every problem rather than the first: an importer showing one error
 * per row per attempt makes a 200-row spreadsheet an afternoon's work.
 */
export function validateAlumni(record: Partial<AlumniDraft>): FieldErrors {
  const errors: FieldErrors = {};

  if (!filled(record.fullName)) {
    errors.fullName = 'Name is required.';
  }

  if (!filled(record.yearOfPassing)) {
    errors.yearOfPassing = 'Year of passing is required.';
  } else {
    const year = Number(record.yearOfPassing);
    if (!Number.isInteger(year) || year < 1900 || year > CURRENT_YEAR + 6) {
      // +6 rather than the current year: a student graduating in four years is
      // a legitimate record, and rejecting it would push staff to enter a
      // wrong year to get past the form.
      errors.yearOfPassing = `Year must be between 1900 and ${CURRENT_YEAR + 6}.`;
    }
  }

  if (!filled(record.course)) {
    errors.course = 'Course is required.';
  }

  // Optional, but checked when present — a stored mobile nobody can dial is
  // worse than an empty column.
  if (filled(record.mobile) && !isIndianMobile(String(record.mobile))) {
    errors.mobile = 'Enter a 10-digit Indian mobile starting 6, 7, 8 or 9.';
  }

  if (filled(record.email) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(record.email).trim())) {
    errors.email = 'Enter a valid email address.';
  }

  return errors;
}

export function isValid(record: Partial<AlumniDraft>): boolean {
  return Object.keys(validateAlumni(record)).length === 0;
}
