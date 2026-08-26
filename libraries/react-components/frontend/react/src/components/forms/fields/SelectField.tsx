// components/forms/fields/SelectField.tsx
import {
  Box,
  Checkbox,
  Chip,
  FormControl,
  FormHelperText,
  InputLabel,
  ListItemText,
  MenuItem,
  Select,
} from '@mui/material';
import { memo } from 'react';

import { asChoice, asStringArray } from './valueCoercion';

import type { FieldRendererProps, FieldValue, ValidatorMap } from './types';
import type { FieldConfigV2 } from '@/types/formSystem';

/**
 * Single and multiple select. `choice.multiple` switches modes; the value is a
 * string for single and string[] for multiple.
 */
function SelectField({
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
  // The `multiselect` type implies multi-mode on its own, so a schema does not
  // have to redundantly set `choice.multiple` as well.
  const multiple = field.type === 'multiselect' || Boolean(field.choice?.multiple);
  const labelId = `${name}-label`;

  const selectedMany = asStringArray(value);
  const current = multiple ? selectedMany : asChoice(value);

  const labelFor = (v: string) => field.options?.find((o) => o.value === v)?.label ?? v;

  return (
    <FormControl fullWidth margin="normal" error={Boolean(error)} disabled={disabled}>
      <InputLabel id={labelId}>{field.label}</InputLabel>
      <Select
        {...attrs}
        labelId={labelId}
        label={field.label}
        multiple={multiple}
        value={current}
        name={name}
        inputRef={inputRef}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => onBlur(current)}
        renderValue={
          multiple
            ? (selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {asStringArray(selected).map((v) => (
                    <Chip key={v} size="small" label={labelFor(v)} />
                  ))}
                </Box>
              )
            : undefined
        }
      >
        {field.options?.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {multiple && <Checkbox checked={selectedMany.includes(option.value)} size="small" />}
            <ListItemText primary={option.label} />
          </MenuItem>
        ))}
      </Select>
      {error && <FormHelperText>{error}</FormHelperText>}
    </FormControl>
  );
}

/** An empty multi-select is `[]`, which a plain `required` check does not reliably catch. */
// eslint-disable-next-line react-refresh/only-export-components -- Renderer-specific validator intentionally lives beside its component.
export function buildSelectValidators(field: FieldConfigV2): ValidatorMap {
  const multiple = field.type === 'multiselect' || Boolean(field.choice?.multiple);
  if (!field.required || !multiple) return {};
  return {
    requiredSelection: (value: FieldValue) =>
      (Array.isArray(value) && value.length > 0) || `${field.label} is required`,
  };
}

export default memo(SelectField);
