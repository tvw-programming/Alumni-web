// components/forms/fields/RatingField.tsx
import { Rating } from '@mui/material';
import { memo } from 'react';

import FieldShell from './FieldShell';

import type { FieldRendererProps, FieldValue, ValidatorMap } from './types';
import type { FieldConfigV2 } from '@/types/formSystem';

function RatingField({
  field,
  value,
  error,
  disabled,
  onChange,
  onBlur,
  name,
  attrs,
}: FieldRendererProps) {
  const maxStars = field.max ?? 5;
  const current = Number(value) || 0;

  return (
    <FieldShell
      field={field}
      error={error}
      disabled={disabled}
      helperText={current ? `${current} of ${maxStars}` : 'Not rated yet'}
    >
      <Rating
        {...attrs}
        name={name}
        value={current}
        max={maxStars}
        precision={field.precision ?? 1}
        disabled={disabled}
        onChange={(_event, next) => onChange(next ?? 0)}
        onBlur={() => onBlur(current)}
        sx={{
          mt: 0.5,
          // Grey unfilled stars read as "optional" even while failing.
          ...(error && { '& .MuiRating-iconEmpty': { color: 'error.main' } }),
        }}
      />
    </FieldShell>
  );
}

/**
 * `required` alone cannot guard a rating: a plain presence check treats 0 as a
 * present value, so an unrated control defaulting to 0 would pass.
 */
// eslint-disable-next-line react-refresh/only-export-components -- Renderer-specific validator intentionally lives beside its component.
export function buildRatingValidators(field: FieldConfigV2): ValidatorMap {
  if (!field.required) return {};
  return {
    requiredRating: (value: FieldValue) => Number(value) > 0 || `${field.label} is required`,
  };
}

export default memo(RatingField);
