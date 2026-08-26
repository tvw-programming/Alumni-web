import { useGridCellEditor, type CustomCellEditorProps } from 'ag-grid-react';
import { useCallback, useMemo, useRef, useState } from 'react';

import { snackbar } from '@/components/snackbar/snackbarBus';
import { normalizeError } from '@/utils/errors';

import { validateDraft } from './validateDraft';

import type { EditorType, InlineEditorParams, SaveContext } from './editingTypes';

export type InlineEditorProps<TData, TValue = unknown> = CustomCellEditorProps<TData, TValue> &
  InlineEditorParams<TData>;

interface UseInlineEditOptions<TData, TValue> {
  props: InlineEditorProps<TData, TValue>;
  editorType: EditorType;
  /** Convert the draft string into the committed value (e.g. Number). */
  parseDraft?: (draft: string) => unknown;
}

/**
 * Core inline-edit state machine, shared by every editor component.
 *
 * Button-driven commit: AG Grid's own "stop editing" (click away, Enter,
 * focus loss) is intercepted by `isCancelAfterEnd` and DISCARDED unless the
 * user pressed Apply — so nothing persists accidentally.
 *
 * Apply flow (pessimistic, default):
 *   validate → call saveHandler (API) → on success commit to the grid
 *   (cell mode: commit value; row mode: applyTransaction with API response)
 *   → on failure keep the editor open and show the error.
 *
 * Apply flow (optimistic):
 *   validate → commit immediately → persist in background →
 *   on failure roll the row back via applyTransaction + toast.
 */
export function useInlineEdit<TData, TValue>({
  props,
  editorType,
  parseDraft,
}: UseInlineEditOptions<TData, TValue>) {
  const [draft, setDraft] = useState<string>(() =>
    props.value === null || props.value === undefined ? '' : String(props.value),
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  /** True only when Apply succeeded — gates isCancelAfterEnd. */
  const committedRef = useRef(false);

  const validationError = useMemo(
    () => validateDraft(draft, editorType, props.validation),
    [draft, editorType, props.validation],
  );

  // Grid-initiated stops (click outside, Enter, navigation) never commit;
  // only our Apply button does. This is the button-driven workflow guard.
  const isCancelAfterEnd = useCallback(() => !committedRef.current, []);
  useGridCellEditor({ isCancelAfterEnd });

  const updateDraft = useCallback((next: string) => {
    setDraft(next);
    setSaveError(null); // stale API errors clear as the user types
  }, []);

  const cancel = useCallback(() => {
    props.api.stopEditing(true); // cancel=true → restore original value
  }, [props.api]);

  const apply = useCallback(async () => {
    if (validationError || saving || !props.data) return;

    // Prefer the data field over the colId so extra columns bound to the same
    // field (e.g. a star-rating view of `rating` with its own colId) persist
    // and commit against the real field name.
    const field = props.column.getColDef().field ?? props.column.getColId();
    const newValue = parseDraft ? parseDraft(draft) : draft;
    const context: SaveContext<TData> = {
      data: props.data,
      field,
      oldValue: props.value,
      newValue,
    };
    const refreshMode = props.refreshMode ?? 'cell';
    const strategy = props.updateStrategy ?? 'pessimistic';
    const { api, saveHandler } = props;

    const commitCell = () => {
      committedRef.current = true;
      props.onValueChange(newValue as TValue);
      props.stopEditing();
    };

    /** Close the editor WITHOUT committing, then replace the row wholesale. */
    const commitRow = (patch: Partial<TData> | void) => {
      props.stopEditing(); // isCancelAfterEnd discards the cell-level commit
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- A computed generic key cannot be reconstructed as TData by TypeScript.
      const updatedRow = { ...props.data, [field]: newValue, ...(patch ?? {}) } as TData;
      api.applyTransaction({ update: [updatedRow] }); // needs getRowId on the grid
    };

    if (strategy === 'optimistic') {
      // Commit locally first for instant feedback, persist in background.
      if (refreshMode === 'row') commitRow(undefined);
      else commitCell();

      if (!saveHandler) return;
      try {
        const patch = await saveHandler(context);
        if (refreshMode === 'row' && patch) {
          api.applyTransaction({ update: [{ ...context.data, [field]: newValue, ...patch }] });
        }
      } catch (error) {
        // Roll back to the original value and tell the user.
        api.applyTransaction({
          update: [{ ...context.data, [field]: context.oldValue }],
        });
        snackbar.error(`Save failed — change reverted (${normalizeError(error).message})`);
      }
      return;
    }

    // Pessimistic: nothing touches the grid until the API confirms.
    setSaving(true);
    setSaveError(null);
    try {
      const patch = saveHandler ? await saveHandler(context) : undefined;
      if (refreshMode === 'row') commitRow(patch);
      else commitCell();
    } catch (error) {
      setSaveError(normalizeError(error).message); // editor stays open for retry
    } finally {
      setSaving(false);
    }
  }, [draft, parseDraft, props, saving, validationError]);

  return {
    /** Current draft as a string (editors own the input rendering). */
    draft,
    updateDraft,
    /** Validation message for the current draft, or null. */
    validationError,
    /** API failure message from the last Apply attempt, or null. */
    saveError,
    saving,
    canApply: validationError === null && !saving,
    apply,
    cancel,
  };
}
