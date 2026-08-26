// components/forms/fields/FieldShell.tsx
import FormControl from '@mui/material/FormControl';
import FormHelperText from '@mui/material/FormHelperText';
import FormLabel from '@mui/material/FormLabel';

import type { FieldConfigV2 } from '@/types/formSystem';
import type { ReactNode } from 'react';

interface FieldShellProps {
  field: FieldConfigV2;
  error?: string;
  disabled?: boolean;
  helperText?: ReactNode;
  children: ReactNode;
}

/**
 * Shared fieldset wrapper for controls that are not a TextField.
 *
 * FormControl propagates `error` and `required` to the label, its asterisk and
 * the helper text, so each renderer gets consistent error styling for free.
 * The asterisk is pinned red at all times, not only in the error state.
 */
export default function FieldShell({
  field,
  error,
  disabled = false,
  helperText,
  children,
}: FieldShellProps) {
  return (
    <FormControl
      component="fieldset"
      required={field.required}
      error={Boolean(error)}
      disabled={disabled}
      margin="normal"
      fullWidth
      sx={{ display: 'block' }}
    >
      <FormLabel component="legend" sx={{ '& .MuiFormLabel-asterisk': { color: 'error.main' } }}>
        {field.label}
      </FormLabel>

      {children}

      <FormHelperText sx={{ ml: 0 }}>{error ?? helperText ?? ' '}</FormHelperText>
    </FormControl>
  );
}
