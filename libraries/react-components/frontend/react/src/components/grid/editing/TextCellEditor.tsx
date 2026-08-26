import TextField from '@mui/material/TextField';
import { memo } from 'react';

import { useAutoFocus } from '@/hooks/useAutoFocus';

import { InlineEditorShell } from './InlineEditorShell';
import { useInlineEdit, type InlineEditorProps } from './useInlineEdit';

/**
 * In-cell text editor with declarative length validation
 * (`validation: { required, minLength, maxLength }`).
 */
export const TextCellEditor = memo(function TextCellEditor<TData>(
  props: InlineEditorProps<TData, string>,
) {
  const edit = useInlineEdit({ props, editorType: 'text' });
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
        placeholder={props.column.getColDef().headerName}
        value={edit.draft}
        error={edit.validationError !== null}
        onChange={(event) => edit.updateDraft(event.target.value)}
        sx={{ '& .MuiInput-root': { fontSize: '0.875rem' } }}
      />
    </InlineEditorShell>
  );
});
