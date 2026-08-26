import type { ColDef } from 'ag-grid-community';

/**
 * Config-driven inline-editing framework.
 *
 * To make ANY grid editable:
 *   1. Describe columns as `EditableColumnDef` (plain ColDef + edit metadata).
 *   2. Call `buildEditableColDefs(columns, { saveHandler })`.
 *   3. Pass `getRowId` to the grid (required for row refresh + rollback).
 * No per-grid editor wiring needed — everything below is reusable.
 */

export type EditorType = 'text' | 'number' | 'dropdown' | 'rating';

/** Declarative validation evaluated before Apply is enabled. */
export interface EditValidation {
  required?: boolean;
  /** text: length bounds */
  minLength?: number;
  maxLength?: number;
  /** number / rating: range bounds */
  min?: number;
  max?: number;
}

/**
 * cell — commit only the edited cell value (grid change detection refreshes it).
 * row  — replace the whole row from the API response via applyTransaction.
 */
export type RefreshMode = 'cell' | 'row';

/**
 * pessimistic (default) — commit to the grid only AFTER the API succeeds.
 * optimistic — commit immediately, persist in background, roll back on failure.
 */
export type UpdateStrategy = 'pessimistic' | 'optimistic';

export interface EditorOption {
  label: string;
  value: string | number;
}

/** Everything a save handler needs to persist one edit. */
export interface SaveContext<TData> {
  data: TData;
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

/**
 * Persists one edit. Return the updated row (or a partial patch) to support
 * `refreshMode: 'row'` — the response is merged over the local row.
 */
export type SaveHandler<TData> = (context: SaveContext<TData>) => Promise<Partial<TData> | void>;

/** Params delivered to editors through AG Grid's cellEditorParams. */
export interface InlineEditorParams<TData> {
  validation?: EditValidation;
  options?: EditorOption[];
  saveHandler?: SaveHandler<TData>;
  refreshMode?: RefreshMode;
  updateStrategy?: UpdateStrategy;
}

/** ColDef extended with the inline-editing config flags. */
export type EditableColumnDef<TData> = ColDef<TData> & {
  /** Column-level switch. Only true + an editorType makes a column editable. */
  inlineEditable?: boolean;
  editorType?: EditorType;
  /** Dropdown options inline… */
  editorOptions?: readonly (string | EditorOption)[];
  /** …or looked up from InlineEditGridConfig.optionsMap (shared lists). */
  optionsKey?: string;
  validation?: EditValidation;
  /** Default 'cell'. */
  refreshMode?: RefreshMode;
  /** Per-column override of the grid-level save handler. */
  saveHandler?: SaveHandler<TData>;
};

/** Grid-level editing config shared by all columns of one grid. */
export interface InlineEditGridConfig<TData> {
  /** Master switch — false renders the whole grid read-only. Default true. */
  inlineEditable?: boolean;
  /** Default save handler (columns may override). */
  saveHandler?: SaveHandler<TData>;
  /** Default 'pessimistic'. */
  updateStrategy?: UpdateStrategy;
  /** Named option lists resolved via column `optionsKey`. */
  optionsMap?: Record<string, readonly (string | EditorOption)[]>;
}

export function normalizeOptions(
  options: readonly (string | EditorOption)[] | undefined,
): EditorOption[] {
  return (options ?? []).map((option) =>
    typeof option === 'string' || typeof option === 'number'
      ? { label: String(option), value: option }
      : option,
  );
}
