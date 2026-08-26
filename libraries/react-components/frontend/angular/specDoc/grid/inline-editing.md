## Component Specification

### Name & Purpose
The Angular inline-editing framework. Config-driven, and a faithful port — the
framework-free half is byte-identical to React's, with its tests.

### Location
`src/app/shared/grid/editing/` — `editing.types.ts`, `validate-draft.ts`,
`build-editable-col-defs.ts`, `inline-edit-base.ts`, `inline-editor-shell.ts`,
`text-cell-editor.ts`, `number-cell-editor.ts`, `dropdown-cell-editor.ts`,
`rating-cell-editor.ts`, `pencil-edit-renderer.ts`, `star-rating-renderer.ts`

### Public Interface

Identical config surface to React — see
`frontend/react/specDoc/grid/inline-editing.md` for `EditableColumnDef`,
`InlineEditGridConfig`, `SaveHandler`, `validateDraft`.

```ts
export function buildEditableColDefs<TData>(
  columns: EditableColumnDef<TData>[], config?: InlineEditGridConfig<TData>): ColDef<TData>[];

@Directive()
export abstract class InlineEditBase<TData, TValue = unknown> implements ICellEditorAngularComp {
  readonly draft: WritableSignal<string>;
  readonly saving: WritableSignal<boolean>;
  readonly saveError: WritableSignal<string | null>;
  readonly validationError: Signal<string | null>;
  readonly canApply: Signal<boolean>;
  readonly errorText: Signal<string | null>;

  agInit(params): void;
  afterGuiAttached(): void;      // focuses `#field`
  getValue(): TValue;
  isCancelAfterEnd(): boolean;   // the button-driven guard
  apply(): Promise<void>;
  cancel(): void;
  onKeydown(event: KeyboardEvent): void;
}
```

### Dependencies
- Internal: `SnackbarService`, `normalize-error`.
- External: `ag-grid-angular` (`ICellEditorAngularComp`), Angular Material.

### Data Models
`editing.types.ts` and `validate-draft.ts` are **verbatim copies** of the React
files; 19 of their tests pass unmodified, which is the evidence the port is
faithful.

### Business Rules & Constraints

**React's `useInlineEdit` hook became an abstract `@Directive` base**, because AG
Grid instantiates editors as components — the state machine has to *be* the
component. `useState` values became signals, so `canApply` is a `computed` the
template reads.

**Autofocus is declared once on the base:**

```ts
protected readonly field = viewChild<ElementRef<HTMLElement>>('field');
afterGuiAttached(): void { this.field()?.nativeElement.focus(); }
```
A view query on a `@Directive` base resolves against each subclass's template —
one declaration, four editors.

**Commit stays button-driven.** `isCancelAfterEnd()` discards every
grid-initiated stop unless Apply was pressed. **Verified**: Escape after typing
leaves the row unchanged.

**Both strategies behave as React's** — pessimistic commits only after the API
confirms; optimistic commits first and rolls back with a snackbar.

**The dropdown uses a native `<select>`, not `mat-select`** — the Material
version renders an overlay panel that fights AG Grid's in-cell editor and its
focus handling, for no gain at this size.

**The rating editor's stars are real `<button>`s** so the control is
keyboard-operable. In the *renderer* the stars are `aria-hidden`, because the
numeric value beside them says the same thing.

**The shell's output is `cancelled`, not `cancel`** — `cancel` is a native DOM
event name.

### Extension Points

- **A new editor type:** a component extending `InlineEditBase`, marking its
  control `#field`; add it to `EDITOR_COMPONENTS` and the `EditorType` union.
- **A new validation rule:** `validate-draft.ts` — shared with React, so change
  both.
