// components/forms/fields/CheckboxGroupField.tsx
import { Checkbox, FormControlLabel, FormGroup } from '@mui/material';
import { memo } from 'react';

import FieldShell from './FieldShell';
import { asStringArray } from './valueCoercion';

import type { FieldRendererProps, FieldValue, ValidatorMap } from './types';
import type { FieldConfigV2 } from '@/types/formSystem';

/** Multi-choice with all options visible. Value is string[]. */
function CheckboxGroupField({
  field,
  value,
  error,
  disabled,
  onChange,
  onBlur,
  attrs,
}: FieldRendererProps) {
  const selected = asStringArray(value);

  const toggle = (optionValue: string, checked: boolean) => {
    const next = checked ? [...selected, optionValue] : selected.filter((v) => v !== optionValue);
    onChange(next);
    onBlur(next);
  };

  return (
    <FieldShell field={field} error={error} disabled={disabled}>
      <FormGroup {...attrs} row={field.choice?.row ?? false}>
        {field.options?.map((option) => (
          <FormControlLabel
            key={option.value}
            control={
              <Checkbox
                checked={selected.includes(option.value)}
                onChange={(e) => toggle(option.value, e.target.checked)}
                disabled={disabled}
              />
            }
            label={option.label}
          />
        ))}
      </FormGroup>
    </FieldShell>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- Renderer-specific validator intentionally lives beside its component.
export function buildCheckboxGroupValidators(field: FieldConfigV2): ValidatorMap {
  const validators: ValidatorMap = {};
  const min = field.choice?.minSelected;
  const max = field.choice?.maxSelected;

  if (field.required || min) {
    const required = min ?? 1;
    validators.minSelected = (value: FieldValue) =>
      (Array.isArray(value) && value.length >= required) ||
      `Select at least ${required} option${required === 1 ? '' : 's'}`;
  }
  if (max) {
    validators.maxSelected = (value: FieldValue) =>
      (Array.isArray(value) ? value.length : 0) <= max ||
      `Select at most ${max} option${max === 1 ? '' : 's'}`;
  }
  return validators;
}

export default memo(CheckboxGroupField);
