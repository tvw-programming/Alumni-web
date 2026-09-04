import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import { memo } from 'react';

import { useAutoFocus } from '@/hooks/useAutoFocus';

import { InlineEditorShell } from './InlineEditorShell';
import { useInlineEdit, type InlineEditorProps } from './useInlineEdit';

/**
 * In-cell dropdown editor. Options come from the column config
 * (`editorOptions`) or a shared list (`optionsKey` + grid `optionsMap`) —
 * never hardcoded here. The menu itself portals above the grid, but the
 * control renders inside the cell.
 */
export const DropdownCellEditor = memo(function DropdownCellEditor<TData>(
  props: InlineEditorProps<TData, string>,
) {
  const edit = useInlineEdit({ props, editorType: 'dropdown' });
  // MUI hands `inputRef` an imperative handle whose focus() targets the
  // display node, not the hidden form input.
  const focusRef = useAutoFocus<{ focus: () => void }>();
  const options = props.options ?? [];
  const label = props.column.getColDef().headerName;

  return (
    <InlineEditorShell
      error={edit.saveError ?? edit.validationError}
      saving={edit.saving}
      canApply={edit.canApply}
      onApply={edit.apply}
      onCancel={edit.cancel}
    >
      <Select
        inputRef={focusRef}
        fullWidth
        variant="standard"
        error={edit.validationError !== null}
        inputProps={{ 'aria-label': label }}
        value={edit.draft}
        onChange={(event) => edit.updateDraft(event.target.value)}
        sx={{ fontSize: '0.875rem' }}
      >
        {options.map((option) => (
          <MenuItem key={option.value} value={String(option.value)}>
            {option.label}
          </MenuItem>
        ))}
      </Select>
    </InlineEditorShell>
  );
});
