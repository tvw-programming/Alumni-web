# Table variants

> Evidence-based. Claims are labelled **Implemented** / **Inferred** /
> **Recommended** / **Limitation** / **Needs product input**. Unlabelled claims
> are Implemented. See [../README.md](../README.md).

---

## 1. Overview

One typed wrapper over AG Grid Community — `AppDataGrid<TData>` — plus three
progressively richer variants built on it:

| Variant         | Page                 | Adds                                                                      |
| --------------- | -------------------- | ------------------------------------------------------------------------- |
| **Read-only**   | `ProductsReadGrid`   | Quick filter, formatters, pagination                                      |
| **Inline edit** | `ProductsInlineGrid` | Editable cells, validation, save handler, optimistic/pessimistic strategy |
| **Managed**     | `UsersManagedGrid`   | Column/filter preferences, custom renderers, toolbar                      |

The wrapper exists so no page configures AG Grid directly. It derives the grid
theme from the MUI theme, sets sensible column defaults, memoises every option
object, and exposes a small typed prop surface. Everything grid-specific that a
page still needs — column definitions, renderers — goes through `columnDefs`.

The inline-editing layer is **config-driven**: adding editing to a new grid is
column metadata plus one save handler, not new components.

### Business purpose

**Needs product input.** All three variants live under `/admin/master-data`,
which is an **internal component showcase** (decided). Audience: developers
choosing a grid variant for a new screen.

---

## 2. Entry points

| Path                                 | Component                                        | Variant     |
| ------------------------------------ | ------------------------------------------------ | ----------- |
| `/admin/master-data/products`        | `ManageProductPage` → `ProductsReadGrid`         | read-only   |
| `/admin/master-data/products-inline` | `ManageProductInlinePage` → `ProductsInlineGrid` | inline edit |
| `/admin/master-data/users`           | `ManageUserPage` → `UsersManagedGrid`            | managed     |

### Modules

| Module                                            | Exports                                                                                                                                                                                |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/grid/AppDataGrid.tsx`                 | `AppDataGrid`, `AppDataGridProps`, `GridSelectionMode`                                                                                                                                 |
| `components/grid/editing/buildEditableColDefs.ts` | `buildEditableColDefs`                                                                                                                                                                 |
| `components/grid/editing/editingTypes.ts`         | `EditorType`, `EditValidation`, `RefreshMode`, `UpdateStrategy`, `SaveContext`, `SaveHandler`, `EditableColumnDef`, `InlineEditGridConfig`, `InlineEditorParams`, `normalizeOptions`   |
| `components/grid/editing/validateDraft.ts`        | `validateDraft`                                                                                                                                                                        |
| `components/grid/editing/useInlineEdit.ts`        | `useInlineEdit`                                                                                                                                                                        |
| `components/grid/gridPreferences.ts`              | `WIDTH_MODE_OPTIONS`, `buildColumnPreferences`, `applyPreferencesToColDefs`, `applyWidthModes`, `applySortTiers`, `reorderPreferences`, `deriveFilterOptions`, `applyFiltersToRows`, … |
| `components/grid/renderers/`                      | `GenderIconRenderer`, `HtmlCellRenderer`, `RefreshRowRenderer`, `UppercaseActionRenderer`                                                                                              |
| `hooks/useGridPreferences.ts`                     | `useGridPreferences`                                                                                                                                                                   |

---

## 3. User flows

### Primary — browse

1. Page calls a hook (`useProducts` / `useUsers`).
2. Rows render; `loading` shows AG Grid's overlay.
3. Typing in the toolbar sets `quickFilterText`, which filters across all columns.

### Primary — edit a cell (inline variant)

1. User clicks the pencil in a cell (or double-clicks, per `editOn`).
2. An editor opens **inside** the cell (`cellEditorPopup: false`).
3. Every keystroke runs `validateDraft`; **Apply stays disabled while it returns
   an error**, so no invalid value reaches the API.
4. Apply → `saveHandler(context)`.
   - **Pessimistic** (default): await the API, then commit to the grid.
   - **Optimistic**: commit immediately, persist in the background, roll back on
     failure.
5. `refreshMode: 'cell'` updates the one cell; `'row'` replaces the row from the
   API response via `applyTransaction`.

### Primary — reorder and resize columns (managed variant)

Preferences panel edits column order, visibility, width mode and up to three
sort tiers; `useGridPreferences` persists them.

### Alternate — no rows

`noRowsMessage` renders in AG Grid's overlay instead of an empty grid.

### Failure — save rejects

The editor stays open with the error; the cell keeps its original value. In
optimistic mode the committed value is rolled back.

---

## 4. Architecture

```
Page (ManageProductPage / ManageUserPage / …)
   │
   ├── Hook (useProducts / useUsers)          data, cancellation, invalidation
   │
   └── Grid variant (features/admin/grids/*)  columns, toolbar, save handler
          │  columnDefs, rowData, callbacks
          ▼
       AppDataGrid<TData>                     typed wrapper, theme, memoised options
          │  GridOptions
          ▼
       AG Grid Community
          ▲
          │  cellEditor / cellRenderer
   components/grid/editing/*                  editors + state machine
   components/grid/renderers/*                custom cell renderers
```

### Responsibility boundaries

| Concern                           | Owner                                       |
| --------------------------------- | ------------------------------------------- |
| Fetching rows                     | Page hook                                   |
| Column definitions                | Variant                                     |
| Grid theme, defaults, memoisation | `AppDataGrid`                               |
| Which columns are editable        | `buildEditableColDefs` (from metadata)      |
| Editor state machine              | `useInlineEdit`                             |
| Whether a draft is valid          | `validateDraft`                             |
| Persisting an edit                | Page's `SaveHandler`                        |
| Column/filter preferences         | `gridPreferences.ts` + `useGridPreferences` |

---

## 5. `AppDataGrid` API

| Prop                                    | Type                               | Default               | Notes                                |
| --------------------------------------- | ---------------------------------- | --------------------- | ------------------------------------ |
| `rowData`                               | `TData[] \| undefined`             | —                     | `undefined` = not loaded yet         |
| `columnDefs`                            | `ColDef<TData>[]`                  | —                     | **Required**                         |
| `loading`                               | `boolean`                          | `false`               | AG Grid loading overlay              |
| `height`                                | `number \| string`                 | —                     |                                      |
| `pagination`                            | `boolean`                          | `false`               |                                      |
| `paginationPageSize`                    | `number`                           | `10`                  |                                      |
| `pageSizeOptions`                       | `number[]`                         | `[size, 25, 50, 100]` |                                      |
| `selectionMode`                         | `'single' \| 'multiple' \| 'none'` | —                     |                                      |
| `checkboxSelection`                     | `boolean`                          | —                     |                                      |
| `clickSelection`                        | `boolean`                          | `true`                | Select by clicking the row           |
| `quickFilterText`                       | `string`                           | —                     | Free-text across all columns         |
| `sortable` / `filterable` / `resizable` | `boolean`                          | —                     | Column defaults                      |
| `floatingFilter`                        | `boolean`                          | `true`                | Filter row under headers             |
| `animateRows`                           | `boolean`                          | `true`                |                                      |
| `columnsMovable`                        | `boolean`                          | `true`                | Per-column: `colDef.suppressMovable` |
| `getRowId`                              | `(data: TData) => string`          | —                     | **Required for transactions**        |
| `editOn`                                | `'click' \| 'doubleClick'`         | `'doubleClick'`       |                                      |
| `noRowsMessage`                         | `string`                           | —                     |                                      |
| `defaultColDefOverrides`                | `ColDef<TData>`                    | —                     | Merged over computed defaults        |
| `gridOptions`                           | `GridOptions<TData>`               | —                     | Escape hatch                         |
| `onGridReady`                           | `(api: GridApi<TData>) => void`    | —                     |                                      |
| `onSelectionChanged`                    | `(rows: TData[]) => void`          | —                     |                                      |
| `onRowClicked`                          | `(row: TData) => void`             | —                     |                                      |

`getRowId` is called out in its own doc comment because row-level transactions
(`api.applyTransaction`) need stable identity — without it a single-row update
re-renders the whole grid.

### Theme derivation

```tsx
const gridTheme = useMemo(
  () => themeQuartz.withParams({/* colours from the MUI theme */}),
  [theme /* … */],
);
```

Transparent surfaces so the grid sits on the page like other themed components
rather than looking like an embedded widget. Memoised because rebuilding a theme
object per render would re-style every cell.

---

## 6. The inline-editing contract

### Column metadata

```ts
export type EditableColumnDef<TData> = ColDef<TData> & {
  inlineEditable?: boolean; // column switch
  editorType?: EditorType; // 'text' | 'number' | 'dropdown' | 'rating'
  editorOptions?: readonly (string | EditorOption)[];
  optionsKey?: string; // shared list from InlineEditGridConfig.optionsMap
  validation?: EditValidation;
  refreshMode?: RefreshMode; // 'cell' | 'row', default 'cell'
  saveHandler?: SaveHandler<TData>; // per-column override
};
```

### Grid config

```ts
export interface InlineEditGridConfig<TData> {
  inlineEditable?: boolean; // master switch, default true
  saveHandler?: SaveHandler<TData>;
  updateStrategy?: UpdateStrategy; // default 'pessimistic'
  optionsMap?: Record<string, readonly (string | EditorOption)[]>;
}
```

### Enablement rule

```ts
const enabled = gridEditable && inlineEditable === true && editorType !== undefined;
if (!enabled) return { ...baseColDef, editable: false };
```

Three conditions, all required. A column marked editable but given no
`editorType` **cannot produce a working editor**, so it falls back to read-only
rather than half-configuring the cell. Covered by a test.

### What the builder produces

| Output             | Value                                                         | Why                            |
| ------------------ | ------------------------------------------------------------- | ------------------------------ |
| `editable`         | `true`                                                        |                                |
| `cellRenderer`     | `baseColDef.cellRenderer ?? PencilEditCellRenderer`           | A column's own renderer wins   |
| `cellEditor`       | from `EDITOR_COMPONENTS[editorType]`                          |                                |
| `cellEditorParams` | validation, resolved options, handler, refresh mode, strategy |                                |
| `cellEditorPopup`  | `false`                                                       | Editors render inside the cell |

The builder also **strips its own config keys** (`inlineEditable`, `editorType`,
`validation`, `optionsKey`, …) from the produced `ColDef`, because AG Grid warns
about unknown keys. Asserted by a test.

### Validation gate

`validateDraft(raw, editorType, validation)` returns a message or `null`:

| Case                            | Result                                              |
| ------------------------------- | --------------------------------------------------- |
| Blank, not required             | `null`                                              |
| Blank (or whitespace), required | `'This field is required'`                          |
| Non-numeric for number/rating   | `'Must be a valid number'`                          |
| Below `min` / above `max`       | `'Must be at least N'` / `'Must be at most N'`      |
| Text shorter/longer than bounds | `'Must be at least N characters'` / `'…at most N…'` |

Length rules apply to the **trimmed** value, and are not applied to numeric
editors — `minLength: 3` must not reject `7`.

### Commit semantics

`useInlineEdit` is button-driven on purpose. Its header comment records why:

> Button-driven commit: AG Grid's own "stop editing" (click away, Enter,
> navigation) never commits.

`isCancelAfterEnd` returns `!committedRef.current`, so an accidental click-away
discards the draft instead of persisting a half-typed value.

---

## 7. The three variants compared

| Capability             | Read-only | Inline edit     | Managed           |
| ---------------------- | --------- | --------------- | ----------------- |
| Quick filter           | ✓         | ✓               | ✓ (toolbar)       |
| Value formatters       | ✓         | ✓               | ✓                 |
| Pagination             | ✓         | ✓               | ✓                 |
| Editable cells         | —         | ✓               | —                 |
| Validation before save | —         | ✓               | —                 |
| Optimistic toggle      | —         | ✓               | —                 |
| Editing on/off switch  | —         | ✓               | —                 |
| Custom cell renderers  | —         | ✓ (star rating) | ✓ (4 renderers)   |
| Column preferences     | —         | —               | ✓                 |
| Filter preferences     | —         | —               | ✓                 |
| Multi-tier sort        | —         | —               | ✓                 |
| Fullscreen toolbar     | —         | —               | ✓                 |
| Row prepend via API    | —         | —               | ✓ (`onGridReady`) |

Both editing variants expose `onGridReady` so the page can hold the `GridApi` and
prepend a newly created row without refetching.

---

## 8. Usage examples

### Read-only

```tsx
const productsQuery = useProducts(GRID_FILTERS);
const columnDefs = useMemo<ColDef<Product>[]>(
  () => [
    { field: 'title', headerName: 'Title', flex: 2 },
    { field: 'price', headerName: 'Price', valueFormatter: currencyFormatter },
  ],
  [],
);

<AppDataGrid
  rowData={productsQuery.data}
  columnDefs={columnDefs}
  loading={productsQuery.isLoading}
  quickFilterText={quickFilter}
  pagination
  noRowsMessage="No products match this filter"
/>;
```

### Inline edit

```tsx
const saveHandler = useCallback<SaveHandler<Product>>(async (context) => {
  return updateProduct(context /* … */);
}, []);

const columnDefs = useMemo(
  () =>
    buildEditableColDefs(EDITABLE_COLUMNS, {
      saveHandler,
      inlineEditable: editingEnabled,
      updateStrategy: optimistic ? 'optimistic' : 'pessimistic',
    }),
  [saveHandler, editingEnabled, optimistic],
);

<AppDataGrid rowData={rows} columnDefs={columnDefs} getRowId={(p) => String(p.id)} />;
```

`getRowId` is not optional here in practice: row-mode refresh and optimistic
rollback both use `applyTransaction`.

### Column metadata for editing

```ts
const EDITABLE_COLUMNS: EditableColumnDef<Product>[] = [
  {
    field: 'title',
    inlineEditable: true,
    editorType: 'text',
    validation: { required: true, minLength: 2 },
    refreshMode: 'cell',
  },
  {
    field: 'category',
    inlineEditable: true,
    editorType: 'dropdown',
    optionsKey: 'categories',
    refreshMode: 'row',
  },
  { field: 'rating', inlineEditable: true, editorType: 'rating', validation: { min: 0, max: 5 } },
];
```

---

## 9. Loading, empty and error behaviour

| State                        | Behaviour                                                                         |
| ---------------------------- | --------------------------------------------------------------------------------- |
| `rowData === undefined`      | Headers render; no rows. Layout does not jump when data arrives                   |
| `loading`                    | AG Grid loading overlay                                                           |
| Empty array                  | `noRowsMessage` in the no-rows overlay                                            |
| Fetch failed                 | Handled by the **page**, not the grid — inline error or toast per the global rule |
| Save failed                  | Editor stays open with the message; original value retained                       |
| Quick filter matches nothing | No-rows overlay                                                                   |

**Inferred.** The grid deliberately has no error prop: fetch errors belong to the
page that owns the query, matching how `QueryGate` and the global toast rule work
elsewhere.

---

## 10. Accessibility and responsive behaviour

**Implemented**

- AG Grid emits `grid`, `columnheader`, `gridcell`, `row` and `rowgroup` roles.
  **Verified** by probing the rendered DOM, and asserted in
  `AppDataGrid.test.tsx`.
- Pagination controls are real buttons with accessible names (`First Page`,
  `Previous Page`, `Next Page`, `Last Page`) — the pagination test asserts
  through the accessibility tree rather than a CSS class.
- Editors are focusable MUI controls; `useAutoFocus` puts the caret in the editor
  when it opens.
- The managed toolbar's icon buttons have `aria-label`s.

**Limitation.** Editors are opened with a **pencil icon button** in the cell. That
is discoverable and clickable, but there is no documented keyboard shortcut to
begin editing the focused cell.
**Recommended:** map Enter on a focused editable cell to start editing.

**Limitation.** No automated test covers keyboard navigation _within_ the grid
(arrow keys between cells). AG Grid provides it; this codebase does not verify it.

**Responsive.** Column `flex` values let columns share width; the master-data
shell scrolls the grid area independently of the sidebar (`minHeight: 0` +
`overflowY: auto`). Horizontal scrolling is AG Grid's own.

---

## 11. Best-practice justification

| Practice                              | Code evidence                                                         | Justification                                                                                        | Trade-off                                                                                   |
| ------------------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| **One typed wrapper**                 | `AppDataGridProps<TData>` (`AppDataGrid.tsx:24`)                      | Pages get a small typed surface instead of AG Grid's very large one; defaults are set once.          | The wrapper must grow a prop, or a caller must use `gridOptions`, for anything not exposed. |
| **Config-driven editing**             | `buildEditableColDefs` (`buildEditableColDefs.ts:48`)                 | Adding editing to a grid is metadata plus one handler — no new components.                           | The metadata type is another layer to learn.                                                |
| **Fail-safe enablement**              | `gridEditable && inlineEditable === true && editorType !== undefined` | A half-configured column degrades to read-only rather than rendering a broken editor.                | Silent: a missing `editorType` produces no warning.                                         |
| **Validation before persistence**     | `validateDraft` gates Apply                                           | An invalid value never reaches the API; the rule lives in one pure function.                         | Duplicates whatever the server also enforces.                                               |
| **Button-driven commit**              | `isCancelAfterEnd` (`useInlineEdit.ts:58`)                            | Clicking away discards rather than silently saving a half-typed value.                               | Differs from AG Grid's default, so it must be learned.                                      |
| **Pessimistic by default**            | `config.updateStrategy ?? 'pessimistic'`                              | A grid should not show unsaved data as saved unless its author opted in.                             | An extra round trip before the cell updates.                                                |
| **Config keys stripped**              | builder destructures its own keys out                                 | AG Grid warns on unknown `ColDef` keys.                                                              | The builder must be updated when a config key is added.                                     |
| **Memoised grid options**             | `defaultColDef`, `rowSelection`, `gridTheme`, handlers all memoised   | Prevents AG Grid from tearing down and rebuilding on unrelated parent renders.                       | Several `useMemo`s to keep honest.                                                          |
| **Theme derived from MUI**            | `themeQuartz.withParams(...)`                                         | The grid follows theme changes; colours are not duplicated.                                          | Coupled to AG Grid's theming API.                                                           |
| **Renderers memoised**                | all 4 renderers `memo(...)`                                           | Cell renderers run per visible cell; re-rendering them all on a parent render is the expensive case. | —                                                                                           |
| **Preferences are pure functions**    | `gridPreferences.ts`                                                  | Column ordering, width modes, sort tiers and filters are unit-testable without a grid.               | A large helper module.                                                                      |
| **`getRowId` documented as required** | prop doc comment                                                      | Single-row transactions need stable identity, otherwise the whole grid re-renders.                   | Not enforced by the type system.                                                            |

---

## 12. Testing

Grid coverage was **added during this documentation audit**. Before it, there was
no test file anywhere under `components/grid/` or `features/admin/grids/`.

| File                                   | Tests | Covers                                                                                                                                                                                  |
| -------------------------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AppDataGrid.test.tsx`                 | 11    | Rows and headers; empty message; `undefined` rowData; quick filter; grid-API hand-off; row click; selection emitted / suppressed; pagination controls; custom renderer; grid roles      |
| `editing/buildEditableColDefs.test.ts` | 10    | Read-only fallbacks; master switch; `optionsKey` resolution; inline options win; handler precedence; defaults; explicit optimistic/row; custom renderer preserved; config keys stripped |
| `editing/validateDraft.test.ts`        | 9     | Required/blank; numeric validity and bounds; rating; negatives and decimals; length rules on trimmed text; length rules not applied to numbers                                          |

**30 tests.** Two of the initial assumptions were wrong and the tests caught
them: AG Grid uses role `grid` (not `treegrid`), and always renders the paging
panel hidden via `ag-hidden` rather than omitting it — so the pagination test now
asserts through the accessibility tree.

```bash
cd frontend/react
pnpm exec vitest run src/components/grid   # 30 tests
```

### Gaps

**Limitation.** The three **variants** themselves have no tests. `AppDataGrid`,
the column builder and the validation gate are covered; `ProductsReadGrid`,
`ProductsInlineGrid` and `UsersManagedGrid` are not.

**Limitation.** `useInlineEdit`'s state machine — the commit/cancel/rollback
paths, and optimistic rollback in particular — is **untested**. It is the most
intricate logic in the feature.
**Recommended:** test optimistic rollback first; a silent failure there loses a
user's edit.

**Limitation.** `gridPreferences.ts` (242 lines of pure functions) is untested
despite being the easiest thing here to test.

---

## 13. Limitations and trade-offs

| #   | Limitation                                                                                                              |
| --- | ----------------------------------------------------------------------------------------------------------------------- |
| 1   | **Variants and `useInlineEdit` are untested** (§12).                                                                    |
| 2   | **`gridPreferences.ts` is untested** despite being pure.                                                                |
| 3   | **Four editor types only** — text, number, dropdown, rating. A date editor needs a new component plus a registry entry. |
| 4   | **`getRowId` is documented, not enforced.** Omitting it degrades transaction updates silently.                          |
| 5   | **No keyboard shortcut to begin editing** (§10).                                                                        |
| 6   | **AG Grid Community only.** Grouping, pivoting, server-side row model and Excel export are Enterprise features.         |
| 7   | **Validation duplicates the server's.** `validateDraft` is client-side; the server must re-check.                       |
| 8   | **Preferences persistence scope** — stored per browser via `useGridPreferences`; not per user account.                  |
| 9   | **A failed optimistic save rolls the cell back** but does not re-open the editor, so the typed value is lost.           |
| 10  | **The wrapper hides AG Grid's full surface.** Anything unexposed needs `gridOptions`, which bypasses the typed API.     |

---

## 14. Extension guide

### Add a read-only grid

```tsx
const columnDefs = useMemo<ColDef<Row>[]>(() => [/* … */], []);
<AppDataGrid rowData={query.data} columnDefs={columnDefs} loading={query.isLoading} />;
```

Memoise `columnDefs` — a fresh array per render makes AG Grid rebuild columns.

### Make an existing grid editable

1. Change the column array's type to `EditableColumnDef<TData>[]`.
2. Add `inlineEditable`, `editorType` and `validation` to the columns that should
   be editable.
3. Write one `SaveHandler<TData>`.
4. Pass the array through `buildEditableColDefs(columns, { saveHandler })`.
5. Add `getRowId`.

No new components.

### Add an editor type

1. Build the editor with `useInlineEdit` (follow `NumberCellEditor`).
2. Add it to `EDITOR_COMPONENTS` in `buildEditableColDefs.ts`.
3. Extend `EditorType` in `editingTypes.ts`.
4. Add its branch to `validateDraft` if it needs new rules — and a test, since
   that function is the gate on what reaches the API.

### Add a custom cell renderer

```tsx
export const StatusRenderer = memo(function StatusRenderer(params: ICellRendererParams<Row>) {
  return <Chip size="small" label={String(params.value)} />;
});
```

`memo` is not optional: renderers run per visible cell.

### Add a new grid page

1. Hook for data, `columnDefs` in `useMemo`.
2. Choose a variant to copy.
3. Add the route and the `MASTER_DATA_NAV` entry — one edit gives a sidebar link
   _and_ a voice command.

---

## 15. Evidence index

| Claim                    | File                                                                | Line          |
| ------------------------ | ------------------------------------------------------------------- | ------------- |
| Typed wrapper props      | `frontend/react/src/components/grid/AppDataGrid.tsx`                      | 24            |
| Selection mode type      | `frontend/react/src/components/grid/AppDataGrid.tsx`                      | 22            |
| Theme from MUI theme     | `frontend/react/src/components/grid/AppDataGrid.tsx`                      | 102           |
| Memoised column defaults | `frontend/react/src/components/grid/AppDataGrid.tsx`                      | 124           |
| Memoised row selection   | `frontend/react/src/components/grid/AppDataGrid.tsx`                      | 142           |
| Memoised handlers        | `frontend/react/src/components/grid/AppDataGrid.tsx`                      | 169, 177, 184 |
| Editable column builder  | `frontend/react/src/components/grid/editing/buildEditableColDefs.ts`      | 48            |
| Editor component map     | `frontend/react/src/components/grid/editing/buildEditableColDefs.ts`      | 16            |
| Enablement rule          | `frontend/react/src/components/grid/editing/buildEditableColDefs.ts`      | 66            |
| Editor types             | `frontend/react/src/components/grid/editing/editingTypes.ts`              | 13            |
| Validation config        | `frontend/react/src/components/grid/editing/editingTypes.ts`              | 16            |
| Refresh mode             | `frontend/react/src/components/grid/editing/editingTypes.ts`              | 30            |
| Update strategy          | `frontend/react/src/components/grid/editing/editingTypes.ts`              | 36            |
| Save handler contract    | `frontend/react/src/components/grid/editing/editingTypes.ts`              | 55            |
| Editable column type     | `frontend/react/src/components/grid/editing/editingTypes.ts`              | 67            |
| Grid editing config      | `frontend/react/src/components/grid/editing/editingTypes.ts`              | 83            |
| Validation gate          | `frontend/react/src/components/grid/editing/validateDraft.ts`             | 8             |
| Button-driven commit     | `frontend/react/src/components/grid/editing/useInlineEdit.ts`             | 58            |
| Editor state machine     | `frontend/react/src/components/grid/editing/useInlineEdit.ts`             | 37            |
| Read-only variant        | `frontend/react/src/features/admin/grids/ProductsReadGrid.tsx`            | 42            |
| Inline-edit variant      | `frontend/react/src/features/admin/grids/ProductsInlineGrid.tsx`          | 107, 124      |
| Managed variant          | `frontend/react/src/features/admin/grids/UsersManagedGrid.tsx`            | 99            |
| Preference helpers       | `frontend/react/src/components/grid/gridPreferences.ts`                   | 46–229        |
| Preference persistence   | `frontend/react/src/hooks/useGridPreferences.ts`                          | 65            |
| Toolbar actions          | `frontend/react/src/components/grid/GridHeaderActions.tsx`                | 98            |
| Wrapper tests            | `frontend/react/src/components/grid/AppDataGrid.test.tsx`                 | —             |
| Builder tests            | `frontend/react/src/components/grid/editing/buildEditableColDefs.test.ts` | —             |
| Validation tests         | `frontend/react/src/components/grid/editing/validateDraft.test.ts`        | —             |
