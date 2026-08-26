// components/forms/fields/RadioGroupField.tsx
import { FormControlLabel, Radio, RadioGroup } from '@mui/material';
import { memo } from 'react';

import FieldShell from './FieldShell';
import { asChoice } from './valueCoercion';

import type { FieldRendererProps } from './types';

/**
 * Single choice with every option visible. Preferable to a select below about
 * five options — no click needed to see what's available.
 */
function RadioGroupField({
  field,
  value,
  error,
  disabled,
  onChange,
  onBlur,
  name,
  attrs,
}: FieldRendererProps) {
  return (
    <FieldShell field={field} error={error} disabled={disabled}>
      <RadioGroup
        {...attrs}
        name={name}
        value={asChoice(value)}
        row={field.choice?.row ?? false}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => onBlur(value)}
      >
        {field.options?.map((option) => (
          <FormControlLabel
            key={option.value}
            value={option.value}
            control={<Radio />}
            label={option.label}
            disabled={disabled}
          />
        ))}
      </RadioGroup>
    </FieldShell>
  );
}

export default memo(RadioGroupField);
