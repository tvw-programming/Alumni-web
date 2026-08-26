// components/forms/fields/TextInputField.tsx
import { TextField } from '@mui/material';
import { memo } from 'react';

import { asInputValue } from './valueCoercion';

import type { FieldRendererProps } from './types';

/**
 * Covers every type that is just `<input type="...">` behind a MUI TextField:
 * text, email, password, number, tel, url, search, and the native date/time
 * family. Adding another passthrough type is a registry entry, not a code
 * change here.
 */

/** Native types that always render a value and therefore need a shrunk label. */
const ALWAYS_FILLED = new Set(['date', 'time', 'datetime-local', 'month', 'week', 'color']);

function TextInputField({
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
  const handleChange = (raw: string) => {
    // Without this, `type="number"` stores the string "42" rather than 42.
    if (field.type === 'number') {
      onChange(raw === '' ? '' : Number(raw));
      return;
    }
    onChange(raw);
  };

  return (
    <TextField
      {...attrs}
      name={name}
      value={asInputValue(value)}
      inputRef={inputRef}
      onChange={(e) => handleChange(e.target.value)}
      onBlur={(e) => onBlur(e.target.value)}
      label={field.label}
      placeholder={field.placeholder}
      type={field.type}
      fullWidth
      variant="outlined"
      margin="normal"
      error={Boolean(error)}
      helperText={error}
      disabled={disabled}
      // A date/time input is never visually empty, so a floating label would
      // sit on top of the value.
      InputLabelProps={ALWAYS_FILLED.has(field.type) ? { shrink: true } : undefined}
    />
  );
}

export default memo(TextInputField);
