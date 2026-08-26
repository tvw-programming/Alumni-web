import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';

import { toDisplayString } from '@/utils/format';

import type { PreferenceFieldSpec } from './types';

export interface PreferenceFieldControlProps<TDraft> {
  spec: PreferenceFieldSpec<TDraft>;
  draft: TDraft;
  onDraftChange: (next: TDraft) => void;
}

/**
 * Shared controlled input for one declarative preference field. Sections that
 * describe themselves with `fields` metadata get consistent controls for free;
 * richer sections use `renderContent` instead.
 */
export function PreferenceFieldControl<TDraft>({
  spec,
  draft,
  onDraftChange,
}: PreferenceFieldControlProps<TDraft>) {
  const value = (draft as Record<string, unknown>)[spec.key];
  const patch = (next: unknown) => onDraftChange({ ...draft, [spec.key]: next });

  switch (spec.kind) {
    case 'switch':
      return (
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={Boolean(value)}
              onChange={(event) => patch(event.target.checked)}
            />
          }
          label={spec.label}
        />
      );
    case 'select':
      return (
        <TextField
          select
          size="small"
          fullWidth
          label={spec.label}
          value={toDisplayString(value)}
          onChange={(event) => patch(event.target.value)}
        >
          {spec.options.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
      );
    case 'number':
      return (
        <TextField
          type="number"
          size="small"
          fullWidth
          label={spec.label}
          value={toDisplayString(value)}
          slotProps={{ htmlInput: { min: spec.min, max: spec.max } }}
          onChange={(event) => patch(event.target.value === '' ? null : Number(event.target.value))}
        />
      );
    case 'text':
    default:
      return (
        <TextField
          size="small"
          fullWidth
          label={spec.label}
          placeholder={spec.kind === 'text' ? spec.placeholder : undefined}
          value={toDisplayString(value)}
          onChange={(event) => patch(event.target.value)}
        />
      );
  }
}
