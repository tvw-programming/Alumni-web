import { Validators } from '@angular/forms';

import { registerFieldTypes } from '../field-registry';
import { AutocompleteField } from './autocomplete-field';
import { CheckboxField } from './checkbox-field';
import { CheckboxGroupField } from './checkbox-group-field';
import { FileField } from './file-field';
import { RadioField } from './radio-field';
import { RatingField } from './rating-field';
import { SelectField } from './select-field';
import { SliderField } from './slider-field';
import { SwitchField } from './switch-field';
import { TextField } from './text-field';
import { TextareaField } from './textarea-field';
import { ToggleField } from './toggle-field';

import type { FieldTypeMap } from '../form.types';

/**
 * Registers every built-in field type. Imported once for its side effects by
 * `SchemaForm`, so a consumer never has to remember a separate startup step.
 *
 * Adding a type means adding an entry here — the form engine never changes.
 */

/** Types that are a plain `<input type="…">` behind a Material form field. */
const PASSTHROUGH_TYPES = [
  'text', 'email', 'password', 'number', 'tel', 'url', 'search',
  'color', 'date', 'time', 'datetime-local', 'month', 'week',
];

const builtIns: FieldTypeMap = {
  ...Object.fromEntries(
    PASSTHROUGH_TYPES.map((type) => [
      type,
      {
        render: TextField,
        // Numeric inputs start empty rather than at 0, so a required number
        // field cannot be satisfied by a default the user never chose.
        emptyValue: '',
        // `<input type="email">` alone validates nothing: the form is submitted
        // with `novalidate`, so the browser's own check never runs. The type
        // contributes the validator rather than every schema repeating a
        // pattern, which is what the per-type hook exists for.
        ...(type === 'email' ? { buildValidators: () => [Validators.email] } : {}),
      },
    ]),
  ),
  textarea: { render: TextareaField, emptyValue: '' },
  select: { render: SelectField, emptyValue: '' },
  checkbox: { render: CheckboxField, emptyValue: false },
  switch: { render: SwitchField, emptyValue: false },

  // Single choice, two affordances. `radio` lists the options; `toggle` is a
  // segmented control for mutually exclusive states.
  radio: { render: RadioField, emptyValue: '' },
  toggle: { render: ToggleField, emptyValue: '' },

  /*
   * Array-valued types.
   *
   * `emptyValue: []` must produce a *fresh* array per control — a shared one
   * would be mutated by every form on the page. `buildDefaultValues` copies
   * arrays for exactly this reason; the literal here is the template, not the
   * instance.
   */
  checkboxGroup: { render: CheckboxGroupField, emptyValue: [] },
  autocomplete: { render: AutocompleteField, emptyValue: [] },
  file: { render: FileField, emptyValue: [] },

  // Numeric. 0 rather than '' so a `min` validator compares numbers.
  rating: { render: RatingField, emptyValue: 0 },
  slider: { render: SliderField, emptyValue: 0 },
};

registerFieldTypes(builtIns);

export {
  AutocompleteField,
  CheckboxField,
  CheckboxGroupField,
  FileField,
  RadioField,
  RatingField,
  SelectField,
  SliderField,
  SwitchField,
  TextField,
  TextareaField,
  ToggleField,
};
