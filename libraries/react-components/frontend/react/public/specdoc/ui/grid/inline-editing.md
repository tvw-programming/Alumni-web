## Component Specification

### Name & Purpose

The config-driven inline-editing framework. Makes any grid editable from column
metadata plus one save handler — no per-grid editor wiring.

### Location

`src/components/grid/editing/` — `editingTypes.ts`, `buildEditableColDefs.ts`,
`useInlineEdit.ts`, `validateDraft.ts`, `InlineEditorShell.tsx`,
`TextCellEditor.tsx`, `NumberCellEditor.tsx`, `DropdownCellEditor.tsx`,
`RatingCellEditor.tsx`, `PencilEditCellRenderer.tsx`, `StarRatingCellRenderer.tsx`

### Public Interface

```ts
type EditorType = 'text' | 'number' | 'dropdown' | 'rating';
type RefreshMode = 'cell' | 'row';
type UpdateStrategy = 'pessimistic' | 'optimistic';

interface EditValidation {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
}

type EditableColumnDef<TData> = ColDef<TData> & {
  inlineEditable?: boolean;
  editorType?: EditorType;
  editorOptions?: readonly (string | EditorOption)[];
  optionsKey?: string; // resolved from config.optionsMap
  validation?: EditValidation;
  refreshMode?: RefreshMode; // default 'cell'
  saveHandler?: SaveHandler<TData>; // per-column override
};

interface InlineEditGridConfig<TData> {
  inlineEditable?: boolean; // false → whole grid read-only
  saveHandler?: SaveHandler<TData>;
  updateStrategy?: UpdateStrategy; // default 'pessimistic'
  optionsMap?: Record<string, readonly (string | EditorOption)[]>;
}

type SaveHandler<TData> = (ctx: SaveContext<TData>) => Promise<Partial<TData> | void>;
interface SaveContext<TData> {
  data: TData;
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

export function buildEditableColDefs<TData>(
  columns: EditableColumnDef<TData>[],
  config?: InlineEditGridConfig<TData>,
): ColDef<TData>[];

export function validateDraft(
  raw: string,
  editorType: EditorType,
  validation?: EditValidation,
): string | null;
```

**Making a grid editable — the whole procedure:**

```ts
const colDefs = buildEditableColDefs(
  [
    {
      field: 'name',
      inlineEditable: true,
      editorType: 'text',
      validation: { required: true, minLength: 2 },
    },
    {
      field: 'status',
      inlineEditable: true,
      editorType: 'dropdown',
      optionsKey: 'statuses',
      refreshMode: 'row',
    },
  ],
  {
    saveHandler: (ctx) => api.update(ctx),
    optionsMap: { statuses: ['open', 'closed'] },
    updateStrategy: 'pessimistic',
  },
);
// and pass `getRowId` to the grid.
```

### Dependencies

- Internal: `snackbarBus`, `utils/errors`, `AppDataGrid`.
- External: `ag-grid-react` (`useGridCellEditor`), MUI.

### Data Models

Generic. `validateDraft.ts` and `editingTypes.ts` are framework-free and are
ported **verbatim** to Angular, tests included.

### Business Rules & Constraints

**Commit is button-driven.** AG Grid's own "stop editing" — clicking away, Enter,
focus loss — is intercepted and **discarded** unless Apply was pressed:

```ts
const isCancelAfterEnd = useCallback(() => !committedRef.current, []);
useGridCellEditor({ isCancelAfterEnd });
```

Nothing is ever persisted by accident. **Verified**: typing a value and pressing
Escape leaves the row unchanged.

**Two strategies:**

| Strategy                | Behaviour                                                                                                               |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `pessimistic` (default) | validate → call the API → commit **only** on success. A failure keeps the editor open with the message, ready to retry. |
| `optimistic`            | validate → commit at once → persist in the background → roll the row back and raise a snackbar on failure.              |

**`refreshMode`**: `cell` commits the edited value; `row` closes the editor
without committing and replaces the whole row from the API response via
`applyTransaction` — which is why `getRowId` is mandatory.

**The data field beats the colId** when persisting, so an extra column bound to
the same field (a star-rating view of `rating`) writes the real field name.

**Apply is disabled while `validateDraft` returns an error**, so no request fires
for an invalid value.

### Extension Points

- **A new editor type:** a component using `useInlineEdit`, plus an entry in
  `EDITOR_COMPONENTS` in `buildEditableColDefs.ts` and the `EditorType` union.
- **A new validation rule:** `validateDraft` — it is shared by every editor.
- **A per-column save handler:** `saveHandler` on the column overrides the
  grid-level one.
