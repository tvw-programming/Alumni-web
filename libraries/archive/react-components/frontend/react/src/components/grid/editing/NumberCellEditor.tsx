import TextField from '@mui/material/TextField';
import { memo } from 'react';

import { useAutoFocus } from '@/hooks/useAutoFocus';

import { InlineEditorShell } from './InlineEditorShell';
import { useInlineEdit, type InlineEditorProps } from './useInlineEdit';

/** Digits with optional leading minus and one decimal point. */
const NUMERIC_PATTERN = /^-?\d*\.?\d*$/;

/**
 * In-cell numeric editor: invalid characters are rejected at the keystroke
 * level, range rules come from `validation: { required, min, max }`, and the
 * value commits as a real `number` (via parseDraft).
 */
export const NumberCellEditor = memo(function NumberCellEditor<TData>(
  props: InlineEditorProps<TData, number>,
) {
  const edit = useInlineEdit({
    props,
    editorType: 'number',
    parseDraft: (draft) => Number(draft.trim()),
  });
  const focusRef = useAutoFocus<HTMLInputElement>();

  return (
    <InlineEditorShell
      error={edit.saveError ?? edit.validationError}
      saving={edit.saving}
      canApply={edit.canApply}
      onApply={edit.apply}
      onCancel={edit.cancel}
    >
      <TextField
        inputRef={focusRef}
        fullWidth
        variant="standard"
        type="number"
        inputMode="decimal"
        placeholder={props.column.getColDef().headerName}
        value={edit.draft}
        error={edit.validationError !== null}
        onChange={(event) => {
          // Hard-reject non-numeric characters instead of validating later.
          if (NUMERIC_PATTERN.test(event.target.value)) edit.updateDraft(event.target.value);
        }}
        slotProps={{
          htmlInput: {
            min: props.validation?.min,
            max: props.validation?.max,
            step: 'any',
          },
        }}
        sx={{ '& .MuiInput-root': { fontSize: '0.875rem' } }}
      />
    </InlineEditorShell>
  );
});
