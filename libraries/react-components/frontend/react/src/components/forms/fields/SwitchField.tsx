// components/forms/fields/SwitchField.tsx
import { FormControl, FormControlLabel, FormHelperText, Switch } from '@mui/material';
import { memo } from 'react';

import type { FieldRendererProps } from './types';

/** Same data as `checkbox`, settings-style affordance. */
function SwitchField({
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
          <Switch
            {...attrs}
            name={name}
            inputRef={inputRef}
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
            onBlur={() => onBlur(value)}
          />
        }
        label={field.label}
      />
      <FormHelperText sx={{ ml: 0 }}>{error ?? ' '}</FormHelperText>
    </FormControl>
  );
}

export default memo(SwitchField);
