# Grid

AG Grid **Community v36** — one version ahead of React's v33, which matters
because the Theming API changed. The React grid theme was re-derived, not
copied.

## The wrapper

[`app-data-grid.ts`](../../src/app/shared/grid/app-data-grid.ts) exposes the
same prop surface as React's `AppDataGrid` via `input()`/`output()`.

### Theming

```ts
protected readonly theme = computed(() => {
  const scheme = this.themeStore.isDark() ? colorSchemeDark : colorSchemeLight;
  return themeQuartz.withPart(scheme).withParams({ fontFamily: 'inherit', headerFontWeight: 600 });
});
```

Two things learned the hard way:

1. **The Theming API does not resolve `var(--mat-sys-*)`.** Feeding it Material
   tokens produced washed-out, unreadable text.
2. **Setting `backgroundColor: 'transparent'` breaks contrast derivation.** The
   scheme computes foreground colours from the background; make it transparent
   and every derived colour is wrong.

So the scheme owns the colours, and only genuinely neutral parameters are
overridden.

A related trap outside the grid: the CLI scaffold ships
`body { color-scheme: light; }`, which overrode the theme store's html-level
value and left the page light while the grid went dark. It is now `inherit`.

### Height

**AG Grid needs a resolved height.** `flex: 1 1 auto` inside `mat-card-content`
leaves the row viewport at zero — the header and pagination bar render, and no
rows. Every grid page sets an explicit height (`560px`).

### v36 API differences

| v33 (React) | v36 (Angular) |
| --- | --- |
| `rowSelection="single"` | `rowSelection={{ mode: 'singleRow' }}` |
| `rowSelection="multiple"` | `rowSelection={{ mode: 'multiRow' }}` |
| `.ag-center-cols-container` | `.ag-grid-scrolling-container` |

The last row is a *testing* difference, not an API one, and it cost real time:
`.ag-row` elements are position-absolute and recycled, so **DOM order is not
visual order**. Any assertion about row position must sort by bounding rect.

## Inline editing

Config-driven. To make any grid editable:

1. Describe columns as `EditableColumnDef` — a plain `ColDef` plus edit metadata.
2. Call `buildEditableColDefs(columns, { saveHandler })`.
3. Pass `getRowId` — row refresh and optimistic rollback use `applyTransaction`,
   which needs stable row identity.

No per-grid editor wiring. `editing.types.ts`, `validate-draft.ts` and
`build-editable-col-defs.ts` are **ported verbatim** from React with their
tests; 19 of those tests pass unmodified.

### The state machine

React's `useInlineEdit` hook became
[`InlineEditBase`](../../src/app/shared/grid/editing/inline-edit-base.ts), an
abstract `@Directive`. AG Grid instantiates editors as components, so the state
machine has to *be* the component.

**Button-driven commit.** AG Grid's own "stop editing" — clicking away, Enter,
focus loss — is intercepted by `isCancelAfterEnd()` and **discarded** unless the
user pressed Apply. Nothing is ever persisted by accident.

| Strategy | Behaviour |
| --- | --- |
| `pessimistic` (default) | Validate → call the API → commit only on success. A failure keeps the editor open with the message, ready to retry. |
| `optimistic` | Validate → commit at once → persist in the background → roll the row back and raise a snackbar on failure. |

`refreshMode: 'cell'` commits the edited value; `'row'` replaces the whole row
from the API response via `applyTransaction`.

### Autofocus

`viewChild()` is declared **once on the base class**. A view query on an
`@Directive` base resolves against each subclass's template, so all four editors
get autofocus from one declaration. React needed a `useAutoFocus` call per
editor.

### The four editors

`text`, `number`, `dropdown`, `rating` — each a thin template over the base.

The dropdown uses a native `<select>` rather than `mat-select`: the Material
version renders an overlay panel, which fights AG Grid's in-cell editor and its
focus handling for no gain at this size.

The rating editor's stars are real `<button>`s, so the control is operable by
keyboard rather than being a mouse-only widget. In the *renderer*, the stars
carry `aria-hidden` because the numeric value beside them already says the same
thing.

### Verified

Driving the real grid: the editor opens on the pencil, focus lands in the input,
Apply is disabled on a too-short value and enabled on a valid one, the edit
commits, and **Escape discards without persisting** — the guarantee the whole
button-driven design exists for.

## Not ported

**Limitation.** React's `gridPreferences.ts` — per-user column order, width
modes, sort tiers and filter presets, with a preferences dialog — has no Angular
counterpart. The Angular users grid is a plain grid with a quick filter and
floating filters.
