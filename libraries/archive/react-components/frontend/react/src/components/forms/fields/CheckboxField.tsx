// components/forms/fields/CheckboxField.tsx
import { Checkbox, FormControl, FormControlLabel, FormHelperText } from '@mui/material';
import { memo } from 'react';

import type { FieldRendererProps, FieldValue, ValidatorMap } from './types';
import type { FieldConfigV2 } from '@/types/formSystem';

/**
 * Single boolean — terms acceptance, opt-in, feature flag.
 * The label sits beside the control rather than above it, so this does not use
 * FieldShell.
 */
function CheckboxField({
  field,
  value,
  error,
  disabled,
  onChange,
  onBlur,
  name,
  inputRef,
  attrs,
}: FieldRendererProps) {
  return (
    <FormControl error={Boolean(error)} disabled={disabled} margin="normal" fullWidth>
      <FormControlLabel
        control={
          <Checkbox
            {...attrs}
            name={name}
            inputRef={inputRef}
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
            onBlur={() => onBlur(value)}
          />
        }
        label={
          <>
            {field.label}
            {field.required && <span style={{ color: '#d32f2f' }}> *</span>}
          </>
        }
      />
      <FormHelperText sx={{ ml: 0 }}>{error ?? ' '}</FormHelperText>
    </FormControl>
  );
}

/**
 * `required` on a boolean must mean "must be true" — a plain empty/undefined
 * check would let `false` through, which is exactly wrong for a terms checkbox.
 */
// eslint-disable-next-line react-refresh/only-export-components -- Renderer-specific validator intentionally lives beside its component.
export function buildCheckboxValidators(field: FieldConfigV2): ValidatorMap {
  if (!field.required) return {};
  return {
    mustBeChecked: (value: FieldValue) => value === true || `${field.label} is required`,
  };
}

export default memo(CheckboxField);
