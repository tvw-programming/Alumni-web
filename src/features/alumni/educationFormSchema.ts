/**
 * Education section of the alumni profile, as a `FormSchemaV2`.
 *
 * Declared as data rather than JSX so the same definition drives the create
 * form, the edit form, and the admin's correction dialog — three screens that
 * would otherwise drift apart field by field. `SchemaFormWrapper` renders it.
 *
 * The validation here mirrors the CHECK constraints in
 * db/migrations/000001_alumni.up.sql on purpose. Neither replaces the other:
 * the browser copy makes the error immediate and legible, the database copy is
 * the one that is actually true — it holds for the admin bulk import and the
 * seed script, which never load this file.
 */
import type { FieldConfigV2, FormSchemaV2, FormValues } from '@/types/formSystem';

const CURRENT_YEAR = new Date().getFullYear();

/** Matches education_start_year_sane / education_years_ordered in the schema. */
const YEARS = Array.from({ length: CURRENT_YEAR - 1949 }, (_, i) => {
  const year = CURRENT_YEAR - i;
  return { value: String(year), label: String(year) };
});

const DEGREES = [
  'B.A.', 'B.Sc.', 'B.E.', 'B.Tech', 'B.Com', 'LL.B.', 'MBBS',
  'M.A.', 'M.Sc.', 'M.E.', 'M.Tech', 'MBA', 'LL.M.', 'Ph.D.',
].map((d) => ({ value: d, label: d }));

export const educationFields: FieldConfigV2[] = [
  {
    name: 'institution',
    label: 'Institution',
    type: 'text',
    required: true,
    placeholder: 'College of Engineering, Pune',
    validation: { maxLength: 200 },
  },
  {
    name: 'degree',
    label: 'Degree',
    type: 'autocomplete',
    required: true,
    options: DEGREES,
    // freeSolo because the list above is the common case, not the whole world —
    // an alumnus with a qualification we did not enumerate must still be able
    // to enter it rather than pick something wrong.
    choice: { freeSolo: true },
  },
  {
    name: 'fieldOfStudy',
    label: 'Field of study',
    type: 'text',
    placeholder: 'Computer Science',
    validation: { maxLength: 160 },
  },
  {
    name: 'startYear',
    label: 'Start year',
    type: 'select',
    required: true,
    options: YEARS,
  },
  {
    name: 'endYear',
    label: 'End year',
    type: 'select',
    // Not required: an in-progress degree has no end year, which is also why
    // education_history.end_year is nullable.
    options: [{ value: '', label: 'In progress' }, ...YEARS],
  },
  {
    name: 'grade',
    label: 'Grade / GPA',
    type: 'text',
    validation: { maxLength: 40 },
  },
  {
    name: 'isPrimary',
    label: 'Show this on my profile card',
    type: 'switch',
    // Enforced by the partial unique index education_history_one_primary_idx,
    // so two tabs racing to set it cannot both win.
  },
];

export function buildEducationSchema(
  onSubmit: (values: FormValues) => Promise<void>,
  onError?: (error: unknown) => void,
): FormSchemaV2 {
  return { fields: educationFields, onSubmit, onError };
}

/**
 * The one rule the field list cannot express: end must not precede start.
 * Checked before submit, and again by education_years_ordered in Postgres.
 */
export function validateEducationRow(values: FormValues): string | null {
  const start = Number(values.startYear);
  const end = values.endYear ? Number(values.endYear) : null;
  if (end !== null && end < start) {
    return 'End year cannot be before the start year.';
  }
  return null;
}
