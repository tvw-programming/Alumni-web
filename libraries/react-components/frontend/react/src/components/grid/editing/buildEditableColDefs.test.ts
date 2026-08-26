import { describe, expect, it, vi } from 'vitest';

import { buildEditableColDefs } from './buildEditableColDefs';

import type { EditableColumnDef, InlineEditorParams } from './editingTypes';

interface Row {
  id: number;
  name: string;
  qty: number;
  status: string;
}

/** The editor params AG Grid will hand the editor component. */
function paramsOf(colDef: { cellEditorParams?: unknown }): InlineEditorParams<Row> {
  return colDef.cellEditorParams as InlineEditorParams<Row>;
}

const saveHandler = vi.fn();

describe('buildEditableColDefs', () => {
  it('leaves a column read-only when it opts out or names no editor', () => {
    const [noFlag, noEditor] = buildEditableColDefs<Row>([
      { field: 'id' },
      // Editable flag without an editorType cannot produce a working editor,
      // so it must fall back to read-only rather than half-configure the cell.
      { field: 'name', inlineEditable: true },
    ]);

    expect(noFlag.editable).toBe(false);
    expect(noEditor.editable).toBe(false);
    expect(noFlag.cellEditor).toBeUndefined();
  });

  it('wires an editable column with editor, params and in-cell editing', () => {
    const [colDef] = buildEditableColDefs<Row>([
      {
        field: 'name',
        inlineEditable: true,
        editorType: 'text',
        validation: { required: true, minLength: 2 },
      },
    ]);

    expect(colDef.editable).toBe(true);
    expect(colDef.cellEditor).toBeDefined();
    expect(colDef.cellRenderer).toBeDefined();
    // Editors render inside the cell; a popup would detach them from the row.
    expect(colDef.cellEditorPopup).toBe(false);
    expect(paramsOf(colDef).validation).toEqual({ required: true, minLength: 2 });
  });

  it('makes the whole grid read-only when the master switch is off', () => {
    const columns: EditableColumnDef<Row>[] = [
      { field: 'name', inlineEditable: true, editorType: 'text' },
      { field: 'qty', inlineEditable: true, editorType: 'number' },
    ];

    const colDefs = buildEditableColDefs(columns, { inlineEditable: false });

    // One flag disables editing everywhere — no per-column edits needed.
    expect(colDefs.every((c) => c.editable === false)).toBe(true);
    expect(colDefs.every((c) => c.cellEditor === undefined)).toBe(true);
  });

  it('resolves named option lists through optionsKey', () => {
    const [colDef] = buildEditableColDefs<Row>(
      [{ field: 'status', inlineEditable: true, editorType: 'dropdown', optionsKey: 'statuses' }],
      { optionsMap: { statuses: ['open', 'closed'] } },
    );

    expect(paramsOf(colDef).options).toEqual([
      { label: 'open', value: 'open' },
      { label: 'closed', value: 'closed' },
    ]);
  });

  it('prefers an inline option list over the named one', () => {
    const [colDef] = buildEditableColDefs<Row>(
      [
        {
          field: 'status',
          inlineEditable: true,
          editorType: 'dropdown',
          editorOptions: ['inline-only'],
          optionsKey: 'statuses',
        },
      ],
      { optionsMap: { statuses: ['open', 'closed'] } },
    );

    expect(paramsOf(colDef).options).toEqual([{ label: 'inline-only', value: 'inline-only' }]);
  });

  it('falls back to the grid save handler and lets a column override it', () => {
    const columnHandler = vi.fn();
    const [inherited, overridden] = buildEditableColDefs<Row>(
      [
        { field: 'name', inlineEditable: true, editorType: 'text' },
        { field: 'qty', inlineEditable: true, editorType: 'number', saveHandler: columnHandler },
      ],
      { saveHandler },
    );

    expect(paramsOf(inherited).saveHandler).toBe(saveHandler);
    expect(paramsOf(overridden).saveHandler).toBe(columnHandler);
  });

  it('defaults refreshMode to cell and updateStrategy to pessimistic', () => {
    const [colDef] = buildEditableColDefs<Row>([
      { field: 'name', inlineEditable: true, editorType: 'text' },
    ]);

    // Pessimistic by default: a grid should not show unsaved data as saved
    // unless its author opted into that.
    expect(paramsOf(colDef).refreshMode).toBe('cell');
    expect(paramsOf(colDef).updateStrategy).toBe('pessimistic');
  });

  it('honours an explicit optimistic strategy and row refresh', () => {
    const [colDef] = buildEditableColDefs<Row>(
      [{ field: 'status', inlineEditable: true, editorType: 'dropdown', refreshMode: 'row' }],
      { updateStrategy: 'optimistic' },
    );

    expect(paramsOf(colDef).refreshMode).toBe('row');
    expect(paramsOf(colDef).updateStrategy).toBe('optimistic');
  });

  it('keeps a column custom renderer instead of replacing it with the pencil', () => {
    const custom = () => null;
    const [colDef] = buildEditableColDefs<Row>([
      { field: 'name', inlineEditable: true, editorType: 'text', cellRenderer: custom },
    ]);

    expect(colDef.cellRenderer).toBe(custom);
  });

  it('does not leak edit-only config onto the produced ColDef', () => {
    const [colDef] = buildEditableColDefs<Row>([
      {
        field: 'name',
        headerName: 'Name',
        inlineEditable: true,
        editorType: 'text',
        validation: { required: true },
        optionsKey: 'unused',
      },
    ]);

    // AG Grid warns about unknown ColDef keys; the builder must strip its own.
    const keys = Object.keys(colDef);
    expect(keys).not.toContain('inlineEditable');
    expect(keys).not.toContain('editorType');
    expect(keys).not.toContain('validation');
    expect(keys).not.toContain('optionsKey');
    expect(colDef.headerName).toBe('Name');
  });
});
