import Rating from '@mui/material/Rating';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { memo } from 'react';

import { InlineEditorShell } from './InlineEditorShell';
import { useInlineEdit, type InlineEditorProps } from './useInlineEdit';

/**
 * In-cell star-rating editor (MUI Rating, half-star precision, 0–5). The
 * draft is kept as a string like every other editor; it commits as a real
 * `number`. Range rules come from `validation: { required, min, max }`.
 */
export const RatingCellEditor = memo(function RatingCellEditor<TData>(
  props: InlineEditorProps<TData, number>,
) {
  const edit = useInlineEdit({
    props,
    editorType: 'rating',
    parseDraft: (draft) => Number(draft.trim()),
  });

  const numeric = Number(edit.draft);
  const value = edit.draft.trim() === '' || Number.isNaN(numeric) ? null : numeric;

  return (
    <InlineEditorShell
      error={edit.saveError ?? edit.validationError}
      saving={edit.saving}
      canApply={edit.canApply}
      onApply={edit.apply}
      onCancel={edit.cancel}
    >
      <Stack direction="row" spacing={0.75} alignItems="center">
        <Rating
          size="small"
          precision={0.5}
          max={5}
          value={value}
          onChange={(_event, next) => edit.updateDraft(next === null ? '' : String(next))}
        />
        <Typography variant="body2" color="text.secondary" sx={{ minWidth: 32 }}>
          {value === null ? '—' : value.toFixed(1)}
        </Typography>
      </Stack>
    </InlineEditorShell>
  );
});
