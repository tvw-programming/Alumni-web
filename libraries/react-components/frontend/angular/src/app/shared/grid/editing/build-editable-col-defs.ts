import { DropdownCellEditor } from './dropdown-cell-editor';
import { NumberCellEditor } from './number-cell-editor';
import { PencilEditRenderer } from './pencil-edit-renderer';
import { RatingCellEditor } from './rating-cell-editor';
import { TextCellEditor } from './text-cell-editor';
import { normalizeOptions } from './editing.types';

import type { ColDef } from 'ag-grid-community';
import type {
  EditableColumnDef,
  EditorType,
  InlineEditGridConfig,
  InlineEditorParams,
} from './editing.types';

const EDITOR_COMPONENTS: Record<EditorType, unknown> = {
  text: TextCellEditor,
  number: NumberCellEditor,
  dropdown: DropdownCellEditor,
  rating: RatingCellEditor,
};

/**
 * Turns edit-annotated column configs into real AG Grid ColDefs.
 *
 * A direct port of the React builder, and deliberately so: making a new grid
 * editable stays column metadata plus one save handler, with no per-grid editor
 * wiring. Only the editor components differ between the two apps.
 *
 *   const colDefs = buildEditableColDefs(
 *     [
 *       { field: 'title', inlineEditable: true, editorType: 'text',
 *         validation: { required: true, minLength: 2 } },
 *       { field: 'category', inlineEditable: true, editorType: 'dropdown',
 *         optionsKey: 'categories', refreshMode: 'row' },
 *     ],
 *     { saveHandler: (ctx) => api.update(ctx), optionsMap: { categories } },
 *   );
 *
 * Pass `getRowId` to the grid: row refresh and optimistic rollback both use
 * `applyTransaction`, which needs stable row identity.
 */
export function buildEditableColDefs<TData>(
  columns: EditableColumnDef<TData>[],
  config: InlineEditGridConfig<TData> = {},
): ColDef<TData>[] {
  const gridEditable = config.inlineEditable ?? true;

  return columns.map((column) => {
    const {
      inlineEditable,
      editorType,
      editorOptions,
      optionsKey,
      validation,
      refreshMode,
      saveHandler,
      ...baseColDef
    } = column;

    const enabled = gridEditable && inlineEditable === true && editorType !== undefined;
    if (!enabled) return { ...baseColDef, editable: false };

    const editorParams: InlineEditorParams<TData> = {
      validation,
      options: normalizeOptions(
        editorOptions ?? (optionsKey ? config.optionsMap?.[optionsKey] : undefined),
      ),
      saveHandler: saveHandler ?? config.saveHandler,
      refreshMode: refreshMode ?? 'cell',
      updateStrategy: config.updateStrategy ?? 'pessimistic',
    };

    return {
      ...baseColDef,
      editable: true,
      // The pencil on the right edge is the edit trigger; a column that brings
      // its own renderer keeps it. AG Grid declares `cellRenderer` as `any`, so
      // the annotation is what stops that `any` spreading into this object.
      cellRenderer: (baseColDef.cellRenderer ?? PencilEditRenderer) as unknown,
      cellEditor: EDITOR_COMPONENTS[editorType],
      cellEditorParams: editorParams,
      // Editors render inside the cell — no popup.
      cellEditorPopup: false,
    };
  });
}
