// components/forms/fields/index.ts
//
// Registers every built-in field type. Imported once for its side effects
// (see registerFieldTypes call below, and SchemaFormWrapper's import of this
// module). Adding a type means adding an entry here — SchemaField never
// changes.

import AutocompleteField, { buildAutocompleteValidators } from './AutocompleteField';
import CheckboxField, { buildCheckboxValidators } from './CheckboxField';
import CheckboxGroupField, { buildCheckboxGroupValidators } from './CheckboxGroupField';
import FileUploadField, { buildFileValidators } from './FileUploadField';
import RadioGroupField from './RadioGroupField';
import RatingField, { buildRatingValidators } from './RatingField';
import { registerFieldTypes, resolveFieldType } from './registry';
import SelectField, { buildSelectValidators } from './SelectField';
import SliderField from './SliderField';
import SwitchField from './SwitchField';
import TextareaField from './TextareaField';
import TextInputField from './TextInputField';
import ToggleGroupField from './ToggleGroupField';
import { cloneEmptyValue } from './valueCoercion';

import type { FieldTypeMap } from './types';
import type { FormValues } from '@/types/formSystem';

/** Types that are a plain `<input type="...">` behind a TextField. */
const PASSTHROUGH_TYPES = [
  'text',
  'email',
  'password',
  'number',
  'tel',
  'url',
  'search',
  'color',
  'date',
  'time',
  'datetime-local',
  'month',
  'week',
];

const builtIns: FieldTypeMap = {
  ...Object.fromEntries(
    PASSTHROUGH_TYPES.map((type) => [type, { render: TextInputField, emptyValue: '' }]),
  ),

  textarea: { render: TextareaField, emptyValue: '' },

  select: { render: SelectField, buildValidators: buildSelectValidators, emptyValue: '' },
  multiselect: {
    // Same component; `choice.multiple` is forced on by the schema.
    render: SelectField,
    buildValidators: buildSelectValidators,
    emptyValue: [],
  },
  radio: { render: RadioGroupField, emptyValue: '' },
  toggle: { render: ToggleGroupField, emptyValue: '' },

  checkbox: { render: CheckboxField, buildValidators: buildCheckboxValidators, emptyValue: false },
  switch: { render: SwitchField, emptyValue: false },
  checkboxGroup: {
    render: CheckboxGroupField,
    buildValidators: buildCheckboxGroupValidators,
    emptyValue: [],
  },

  autocomplete: {
    render: AutocompleteField,
    buildValidators: buildAutocompleteValidators,
    emptyValue: '',
  },

  slider: { render: SliderField, emptyValue: 0 },
  rating: { render: RatingField, buildValidators: buildRatingValidators, emptyValue: 0 },
  file: { render: FileUploadField, buildValidators: buildFileValidators, emptyValue: [] },
};

registerFieldTypes(builtIns);

/**
 * Derives `defaultValues` from the schema, using each registered type's
 * `emptyValue`, with per-field overrides applied on top.
 *
 * Hand-maintaining that object drifts: a field added to the JSON but missed in
 * the defaults arrives as `undefined`, which makes MUI mount the input
 * uncontrolled and then switch to controlled on the first keystroke (React
 * logs a warning).
 *
 * Importing this also guarantees the registry is populated before the
 * caller's module body runs, since ES modules fully evaluate dependencies
 * first.
 */
export function buildDefaultValues(
  fields: { name: string; type: string }[],
  overrides: FormValues = {},
): FormValues {
  const values: FormValues = {};

  fields.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(overrides, field.name)) {
      values[field.name] = overrides[field.name];
      return;
    }
    values[field.name] = cloneEmptyValue(resolveFieldType(field.type)?.emptyValue);
  });

  return values;
}

export {
  registerFieldType,
  registerFieldTypes,
  resolveFieldType,
  getRegisteredFieldTypes,
} from './registry';
export type { FieldRendererProps, FieldTypeDefinition, FieldTypeMap, ValidatorMap } from './types';
export { default as FieldShell } from './FieldShell';
