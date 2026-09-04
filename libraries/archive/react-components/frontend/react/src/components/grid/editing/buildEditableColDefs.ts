import { DropdownCellEditor } from './DropdownCellEditor';
import {
  normalizeOptions,
  type EditableColumnDef,
  type EditorType,
  type InlineEditGridConfig,
  type InlineEditorParams,
} from './editingTypes';
import { NumberCellEditor } from './NumberCellEditor';
import { PencilEditCellRenderer } from './PencilEditCellRenderer';
import { RatingCellEditor } from './RatingCellEditor';
import { TextCellEditor } from './TextCellEditor';

import type { ColDef } from 'ag-grid-community';

const EDITOR_COMPONENTS: Record<EditorType, unknown> = {
  text: TextCellEditor,
  number: NumberCellEditor,
  dropdown: DropdownCellEditor,
  rating: RatingCellEditor,
};

/**
 * Turn edit-annotated column configs into real AG Grid ColDefs.
 *
 * Adding inline editing to a NEW grid is column metadata only:
 *
 *   const colDefs = buildEditableColDefs(
 *     [
 *       { field: 'name', inlineEditable: true, editorType: 'text',
 *         validation: { required: true, minLength: 2 }, refreshMode: 'cell' },
 *       { field: 'status', inlineEditable: true, editorType: 'dropdown',
 *         optionsKey: 'statuses', refreshMode: 'row' },
 *       { field: 'qty', inlineEditable: true, editorType: 'number',
 *         validation: { min: 0 } },
 *     ],
 *     {
 *       saveHandler: (ctx) => myApi.update(ctx),   // one handler per grid
 *       optionsMap: { statuses: ['open', 'closed'] },
 *       updateStrategy: 'pessimistic',             // or 'optimistic'
 *       // inlineEditable: false → whole grid read-only, no other changes
 *     },
 *   );
 *
 * Remember to pass `getRowId` to the grid — row refresh and optimistic
 * rollback use applyTransaction, which needs stable row identity.
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
      // Pencil icon on the right edge of the cell is the edit trigger
      // (columns may still supply their own renderer, which wins).
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- AG Grid declares ColDef.cellRenderer as any.
      cellRenderer: baseColDef.cellRenderer ?? PencilEditCellRenderer,
      cellEditor: EDITOR_COMPONENTS[editorType],
      cellEditorParams: editorParams,
      // Compact editors render INSIDE the cell — no popup/popper.
      cellEditorPopup: false,
    };
  });
}
