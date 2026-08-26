// components/forms/fields/SliderField.tsx
import { Box, Slider, Typography } from '@mui/material';
import { memo } from 'react';

import FieldShell from './FieldShell';

import type { FieldRendererProps } from './types';

/** Bounded numeric input — ratings out of 100, price ceilings, quantities. */
function SliderField({
  field,
  value,
  error,
  disabled,
  onChange,
  onBlur,
  name,
  attrs,
}: FieldRendererProps) {
  const opts = field.slider ?? {};
  const min = opts.min ?? 0;
  const max = opts.max ?? 100;
  const current = typeof value === 'number' ? value : min;

  return (
    <FieldShell field={field} error={error} disabled={disabled} helperText={field.placeholder}>
      <Box sx={{ px: 1, pt: 1 }}>
        <Slider
          {...attrs}
          name={name}
          value={current}
          min={min}
          max={max}
          step={opts.step ?? 1}
          marks={opts.marks}
          disabled={disabled}
          valueLabelDisplay="auto"
          // `onChange` fires continuously while dragging; commit the blur only
          // once the handle is released so validation does not thrash.
          onChange={(_event, next) => onChange(next)}
          onChangeCommitted={(_event, next) => onBlur(next)}
        />
        <Typography variant="caption" color="text.secondary">
          {current}
          {opts.unit ?? ''} (range {min}–{max}
          {opts.unit ?? ''})
        </Typography>
      </Box>
    </FieldShell>
  );
}

export default memo(SliderField);
