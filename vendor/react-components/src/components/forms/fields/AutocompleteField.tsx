// components/forms/fields/AutocompleteField.tsx
import { Autocomplete, Chip, TextField } from '@mui/material';
import { memo, useMemo } from 'react';

import { asChoice, asStringArray } from './valueCoercion';

import type { FieldRendererProps, FieldValue, ValidatorMap } from './types';
import type { FieldConfigV2 } from '@/types/formSystem';

interface Option {
  value: string;
  label: string;
}

/**
 * Type-ahead selection. Becomes essential past roughly 20 options, where a
 * plain select stops being usable.
 *
 * `choice.multiple` -> tag mode (value is string[])
 * `choice.freeSolo` -> arbitrary values allowed, i.e. a tag/chip input
 *
 * Form state always holds plain strings; option objects exist only for display.
 */
function AutocompleteField({
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
  const multiple = Boolean(field.choice?.multiple);
  const freeSolo = Boolean(field.choice?.freeSolo);
  const options = useMemo<Option[]>(() => field.options ?? [], [field.options]);

  const toOption = (v: string): Option =>
    options.find((o) => o.value === v) ?? { value: v, label: v };

  const selected = asChoice(value);
  const current = multiple
    ? asStringArray(value).map(toOption)
    : selected === ''
      ? null
      : toOption(selected);

  const extract = (option: Option | string): string =>
    typeof option === 'string' ? option : option.value;

  return (
    <Autocomplete
      {...attrs}
      multiple={multiple}
      freeSolo={freeSolo}
      disabled={disabled}
      options={options}
      value={current}
      limitTags={field.choice?.limitTags ?? -1}
      isOptionEqualToValue={(o, v) => extract(o) === extract(v)}
      getOptionLabel={(option) => (typeof option === 'string' ? option : option.label)}
      onChange={(_event, next) => {
        if (multiple) {
          onChange(((next ?? []) as (Option | string)[]).map(extract));
        } else {
          onChange(next ? extract(next as Option | string) : '');
        }
      }}
      onBlur={() => onBlur(value)}
      renderTags={(tagValues, getTagProps) =>
        tagValues.map((option, index) => (
          <Chip
            size="small"
            label={typeof option === 'string' ? option : option.label}
            {...getTagProps({ index })}
            key={extract(option as Option | string)}
          />
        ))
      }
      renderInput={(params) => (
        <TextField
          {...params}
          name={name}
          inputRef={inputRef}
          label={field.label}
          placeholder={field.placeholder}
          margin="normal"
          error={Boolean(error)}
          helperText={error}
          required={field.required}
        />
      )}
    />
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- Renderer-specific validator intentionally lives beside its component.
export function buildAutocompleteValidators(field: FieldConfigV2): ValidatorMap {
  if (!field.required || !field.choice?.multiple) return {};
  return {
    requiredSelection: (value: FieldValue) =>
      (Array.isArray(value) && value.length > 0) || `${field.label} is required`,
  };
}

export default memo(AutocompleteField);
