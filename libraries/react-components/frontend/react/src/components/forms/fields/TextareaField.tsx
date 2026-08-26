// components/forms/fields/TextareaField.tsx
import { TextField } from '@mui/material';
import { memo } from 'react';

import { asInputValue } from './valueCoercion';

import type { FieldRendererProps } from './types';

const DEFAULT_ROWS = 4;

/**
 * `Number(undefined)` is NaN, not nullish, so a plain `?? DEFAULT_ROWS` fallback
 * never fires and MUI receives `rows={NaN}`. Check the parsed value instead.
 */
function toRowCount(rows: unknown): number {
  const parsed = Number(rows);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_ROWS;
}

function TextareaField({
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
    <TextField
      {...attrs}
      name={name}
      value={asInputValue(value)}
      inputRef={inputRef}
      onChange={(e) => onChange(e.target.value)}
      onBlur={(e) => onBlur(e.target.value)}
      label={field.label}
      placeholder={field.placeholder}
      type="text"
      fullWidth
      multiline
      rows={field.rows ?? toRowCount(attrs.rows)}
      variant="outlined"
      margin="normal"
      error={Boolean(error)}
      helperText={error}
      disabled={disabled}
    />
  );
}

export default memo(TextareaField);
