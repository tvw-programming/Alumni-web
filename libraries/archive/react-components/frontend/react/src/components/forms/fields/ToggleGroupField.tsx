// components/forms/fields/ToggleGroupField.tsx
import { ToggleButton, ToggleButtonGroup } from '@mui/material';
import { memo } from 'react';

import FieldShell from './FieldShell';
import { asChoice, asStringArray } from './valueCoercion';

import type { FieldRendererProps } from './types';

/** Segmented control. Best for 2–4 short, mutually exclusive options. */
function ToggleGroupField({
  field,
  value,
  error,
  disabled,
  onChange,
  onBlur,
  attrs,
}: FieldRendererProps) {
  const multiple = Boolean(field.choice?.multiple);
  const current = multiple ? asStringArray(value) : asChoice(value) || null;

  return (
    <FieldShell field={field} error={error} disabled={disabled}>
      <ToggleButtonGroup
        {...attrs}
        exclusive={!multiple}
        value={current}
        disabled={disabled}
        onChange={(_event, next) => {
          // Exclusive mode yields null when the active button is clicked again.
          if (!multiple && next === null) return;
          onChange(next);
          onBlur(next);
        }}
        sx={{ mt: 1, flexWrap: 'wrap' }}
      >
        {field.options?.map((option) => (
          <ToggleButton key={option.value} value={option.value}>
            {option.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </FieldShell>
  );
}

export default memo(ToggleGroupField);
