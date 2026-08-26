# Generic Card and Generic Popup

> Evidence-based. Claims are labelled **Implemented** / **Inferred** /
> **Recommended** / **Limitation** / **Needs product input**. Unlabelled claims
> are Implemented. See [../README.md](../README.md).

---

## 1. Overview

Two presentational shells that carry no business logic:

- **`GenericCard`** — a card surface with built-in loading / error / empty
  states, four visual surfaces, optional window controls (minimise, full-screen,
  resize) and six composition slots.
- **`GenericPopup`** — a controlled Dialog **or** Drawer with a header, a body,
  an action footer and a **close policy** expressed as data.

Both follow the same rule: they render, the parent decides. Neither fetches,
neither navigates, neither owns business state. Both are documented together
because they share that contract and are usually composed with each other.

### Business purpose

**Needs product input.** Both are infrastructure. Their showcase pages
(`/admin/master-data/generic-card`, `/admin/master-data/generic-popup`) are an
**internal component showcase** (decided).

---

## 2. Entry points

| Path                               | Component                |
| ---------------------------------- | ------------------------ |
| `/admin/master-data/generic-card`  | `ManageGenericCardPage`  |
| `/admin/master-data/generic-popup` | `ManageGenericPopupPage` |

Real consumers: `DashboardPage`, `ManageGenericChartPage`, `ApiScenarioCard`
(itself a thin wrapper over `GenericCard`).

### Public API

| Export                                                                                                                                                                                                                                         | From                                            |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `GenericCard`                                                                                                                                                                                                                                  | `components/GenericCard`                        |
| `GenericCardProps`, `GenericCardHeaderConfig`, `GenericCardStateConfig`, `GenericCardAppearanceConfig`, `GenericCardWindowControls`, `GenericCardSlots`, `GenericCardSize`, `GenericCardSurface`                                               | `components/GenericCard/GenericCard.types.ts`   |
| `GenericPopup`                                                                                                                                                                                                                                 | `components/GenericPopup`                       |
| `GenericPopupProps`, `GenericPopupHeaderConfig`, `GenericPopupActions`, `GenericPopupCloseBehavior`, `GenericPopupSlots`, `GenericPopupSize`, `GenericPopupVariant`, `GenericPopupMode`, `GenericPopupCloseReason`, `GenericPopupDrawerAnchor` | `components/GenericPopup/GenericPopup.types.ts` |

---

## 3. User flows

### Card — read a metric

Header (title, subtitle, badge, icon) → metric → description → body → footer
actions. Any part can be omitted; the card collapses cleanly.

### Card — loading, then content

`state.loading` renders a skeleton with a configurable row count in the card's
own shape, so the layout does not jump when data arrives.

### Card — retry after failure

`state.error` renders an alert; `state.onRetry` adds a retry button **whose
behaviour is entirely the parent's**.

### Card — minimise / full-screen

With `windowControls.minimizable` / `fullscreenable`, the card gains header
buttons. Minimised, it pins to a corner and hides its body; full-screen, it fixes
to the viewport above the modal layer. Either can be **controlled** by the parent
(to coordinate several cards) or left uncontrolled.

### Popup — confirm an action

Open → body → **Confirm** calls `actions.onConfirm`; **Cancel** calls
`onClose('cancel')`.

### Popup — submit a parent-owned form

`actions.formId` turns Confirm into `type="submit"` with `form={formId}`, so the
form lives in the body and the button lives in the footer without a ref or a
callback. The union type makes `formId` and `onConfirm` mutually exclusive.

### Popup — blocked close

With `closeBehavior.dirty` + `preventCloseWhenDirty`, backdrop clicks and Escape
are refused and `onBlockedClose(reason)` fires so the parent can ask "discard
changes?".

### Popup — while saving

`actions.loading` shows a spinner in Confirm, disables both buttons, and (by
default) blocks closing.

---

## 4. Architecture

```
Parent (page / feature)
   │ header, state, appearance, windowControls, slots, children
   ▼
GenericCard                          MUI Card + CardHeader/Content/Actions
   ├── resolveBody(state, slots, children)   loading → error → empty → body
   ├── WindowActions                          minimise / full-screen
   └── buildCardSx(surface, hoverAnimation)   theme-aware surface

Parent
   │ open, onClose, header, actions, closeBehavior, slots
   ▼
GenericPopup                         MUI Dialog | Drawer
   ├── Header    (title, description, icon, action, close)
   ├── DialogContent (slots.body ?? children)
   ├── Footer    (cancel / confirm, or slots.footer)
   └── isCloseBlocked(reason, behavior, loading)
```

### Responsibility boundaries

| Concern                      | Owner                                    |
| ---------------------------- | ---------------------------------------- |
| What is inside               | Parent (`children` / `slots`)            |
| Which state is showing       | Parent (`state` / `open`)                |
| **Priority** between states  | Component (`resolveBody`)                |
| Minimise / full-screen state | Component, unless the parent controls it |
| Whether a close is allowed   | Component, from parent-supplied policy   |
| What Confirm does            | Parent                                   |
| Focus trap, portal, Escape   | MUI                                      |

---

## 5. `GenericCard` API

Props are grouped into config objects rather than flattened — see
[§10](#10-best-practice-justification).

| Group            | Fields                                                                                                                                                                                                                                             |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `header`         | `title`, `subtitle`, `description`, `avatar`, `icon`, `badge`, `metric`, `action`                                                                                                                                                                  |
| `state`          | `loading`, `loadingRows`, `empty`, `emptyTitle`, `emptyDescription`, `emptyIcon`, `error`, `errorTitle`, `onRetry`, `retryLabel`                                                                                                                   |
| `appearance`     | `size` (`compact`/`regular`/`expanded`), `surface` (`default`/`subtle`/`accent`/`glass`), `hoverAnimation`, `selected`, `responsive`                                                                                                               |
| `windowControls` | `minimizable`, `minimized`, `defaultMinimized`, `onMinimizedChange`, `fullscreenable`, `fullScreen`, `defaultFullScreen`, `onFullScreenChange`, `resizable`, `minimizedBottom`, `minimizedRight`, `minWidth`, `minHeight`, `maxWidth`, `maxHeight` |
| `slots`          | `header`, `body`, `footer`, `loading`, `empty`, `error`                                                                                                                                                                                            |
| top-level        | `children`, `onClick`, `disabled`, plus MUI `CardProps`                                                                                                                                                                                            |

### State priority

```ts
function resolveBody(state, slots, children) {
  if (state.loading) return slots?.loading ?? <LoadingState rows={state.loadingRows ?? 3} />;
  if (state.error != null) return slots?.error ?? <ErrorState state={state} />;
  if (state.empty) return slots?.empty ?? <EmptyState state={state} />;
  return slots?.body ?? children;
}
```

Each state has a default **and** a slot override, so a caller can replace one
state's rendering without reimplementing the others.

### Controlled or uncontrolled window state

```ts
function useControllableBoolean(controlled, defaultValue, onChange) {
  const [internal, setInternal] = useState(defaultValue);
  const value = controlled ?? internal;
  // …
}
```

Pass `minimized` to control it; omit it and the card manages itself. One hook
covers both, so there is no "controlled variant" component.

### Surfaces and the theme guard

`surface: 'glass'` and `'accent'` read `theme.glass` tokens supplied by
`AppThemeProvider`. Every read goes through:

```ts
function glassIsEnabled(theme: Theme): boolean {
  return theme.glass?.enabled === true;
}
```

**This was a real bug.** `buildCardSx` previously read `theme.glass.enabled`
unguarded, so `surface="glass"` threw `Cannot read properties of undefined`
outside the provider — in tests and isolated previews. Now every surface degrades
to its plain fallback. Guarded by a test that renders all four surfaces on a bare
MUI theme.

### Interactivity

`onClick` makes the card activatable and adds `role="button"`, `tabIndex={0}` and
Enter/Space handling. `isInteractiveTarget()` checks whether the event came from
a nested control:

```ts
target.closest('a, button, input, select, textarea, [role="button"], [contenteditable="true"]');
```

so clicking a button inside a clickable card does **not** also trigger the card.

---

## 6. `GenericPopup` API

| Prop             | Type                                              | Default     | Notes                                                                          |
| ---------------- | ------------------------------------------------- | ----------- | ------------------------------------------------------------------------------ |
| `open`           | `boolean`                                         | —           | **Required.** Fully controlled                                                 |
| `onClose`        | `(reason: GenericPopupCloseReason) => void`       | —           | **Required.** Reason is `'backdrop' \| 'escape' \| 'close-button' \| 'cancel'` |
| `onBlockedClose` | same signature                                    | —           | Fires when policy refused a close                                              |
| `variant`        | `'dialog' \| 'drawer'`                            | `'dialog'`  |                                                                                |
| `size`           | `'small' \| 'medium' \| 'large' \| 'full-screen'` | `'medium'`  | Dialog `maxWidth` / drawer width                                               |
| `mode`           | `'default' \| 'warning' \| 'destructive'`         | `'default'` | Icon, border, confirm colour                                                   |
| `drawerAnchor`   | `'left' \| 'right'`                               | `'right'`   |                                                                                |
| `header`         | `GenericPopupHeaderConfig`                        | `{}`        |                                                                                |
| `actions`        | `GenericPopupActions`                             | —           | Confirm/cancel config                                                          |
| `closeBehavior`  | `GenericPopupCloseBehavior`                       | `{}`        |                                                                                |
| `slots`          | `{ header, body, footer }`                        | —           |                                                                                |
| `stickyFooter`   | `boolean`                                         | `false`     |                                                                                |
| `keepMounted`    | `boolean`                                         | `false`     |                                                                                |
| `ariaLabel`      | `string`                                          | `'Popup'`   | Fallback when a custom header has no title                                     |

### Actions are a discriminated union

```ts
export type GenericPopupActions = GenericPopupActionBase &
  ({ formId: string; onConfirm?: never } | { formId?: never; onConfirm?: () => void });
```

A popup either submits a form **or** runs a callback. `onConfirm?: never` makes
supplying both a compile error rather than a runtime ambiguity about which wins.

### Close policy as data

```ts
function isCloseBlocked(reason, behavior, loading): boolean {
  if (loading && (behavior.preventCloseWhileLoading ?? true)) return true;
  if (behavior.dirty && behavior.preventCloseWhenDirty) return true;
  if (reason === 'backdrop' && behavior.closeOnBackdrop === false) return true;
  if (reason === 'escape' && behavior.closeOnEscape === false) return true;
  return false;
}
```

One pure function instead of `if`s spread across handlers. Note the default:
**closing is blocked while loading unless you opt out** — the safe direction.

### Accessibility comes from MUI

`Dialog` and `Drawer` provide portal rendering, focus trap, focus restoration,
Escape handling and `aria-modal`. The component adds:

- `aria-labelledby` pointing at a generated title id, or `aria-label` when a
  custom header is used;
- `aria-describedby` when `header.description` exists;
- a visually-hidden `<h2>` when no visible title is supplied, so the dialog is
  never unnamed;
- `role="dialog"` + `aria-modal` on the drawer paper, which MUI does not add for
  `Drawer` by default.

---

## 7. Usage examples

### Card with query states

```tsx
<GenericCard
  header={{ title: 'Revenue', subtitle: 'This month', icon: <ShowChartIcon /> }}
  state={{ loading: query.isLoading, error: errorText, empty: rows.length === 0 }}
  appearance={{ size: 'expanded', surface: 'glass' }}
  slots={{ footer: <Button onClick={openReport}>Open report</Button> }}
>
  <RevenueChart data={rows} />
</GenericCard>
```

### Card as a window

```tsx
<GenericCard
  header={{ title: 'Analytics' }}
  windowControls={{ minimizable: true, fullscreenable: true, resizable: true }}
  appearance={{ size: 'expanded' }}
>
  <GenericChart series={series} />
</GenericCard>
```

### Popup confirming a destructive action

```tsx
<GenericPopup
  open={open}
  onClose={() => setOpen(false)}
  mode="destructive"
  header={{ title: 'Delete product', description: 'This cannot be undone.' }}
  actions={{ confirmLabel: 'Delete', onConfirm: handleDelete, loading: isDeleting }}
>
  <Typography>Delete “{product.title}”?</Typography>
</GenericPopup>
```

### Popup submitting a parent-owned form

```tsx
<GenericPopup
  open={open}
  onClose={close}
  header={{ title: 'Edit product' }}
  actions={{ formId: 'product-form', loading: saving, confirmLabel: 'Save' }}
  closeBehavior={{ dirty, preventCloseWhenDirty: true }}
  onBlockedClose={() => snackbar.info('Discard your changes first')}
  stickyFooter
>
  <form id="product-form" onSubmit={handleSubmit}>
    {/* fields */}
  </form>
</GenericPopup>
```

### Drawer variant

```tsx
<GenericPopup open={open} onClose={close} variant="drawer" size="large" drawerAnchor="right">
  <FilterPanel />
</GenericPopup>
```

---

## 8. Loading, empty and error behaviour

### Card

| State    | Default                                                                                                                           | Slot override   |
| -------- | --------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| Loading  | `LoadingState` — a title skeleton plus `loadingRows` (default 3) text skeletons, `aria-busy`, `aria-label="Loading card content"` | `slots.loading` |
| Error    | `ErrorState` — `Alert` with `errorTitle` (default "Unable to load") and an optional retry button                                  | `slots.error`   |
| Empty    | `EmptyState` — icon, `emptyTitle` (default "Nothing here yet"), description                                                       | `slots.empty`   |
| Normal   | `slots.body ?? children`                                                                                                          | —               |
| Disabled | Body still renders, at 55% opacity, behind a pointer-blocking overlay, `aria-disabled="true"`                                     | —               |

Disabled cards **remain readable** rather than hidden — the information is still
information; only interaction is removed.

### Popup

Loading is expressed through `actions.loading`: spinner in Confirm, both buttons
disabled, closing blocked by default. There is no loading/empty/error state on
the popup itself — the parent renders those in the body.

---

## 9. Accessibility and responsive behaviour

**Implemented — card**

- `aria-labelledby` links the card to its generated title id when `header.title`
  exists.
- Clickable cards get `role="button"`, `tabIndex={0}`, Enter/Space activation and
  `aria-pressed` reflecting `appearance.selected`.
- Keyboard activation is ignored when the event originated in a nested control
  (`event.target !== event.currentTarget`), so Enter inside a nested input does
  not activate the card.
- Disabled cards set `aria-disabled` and block both pointer and keyboard paths —
  **verified** by a test.
- Window-control buttons have `aria-label`s that change with state
  ("Minimize card" / "Restore card").
- Loading skeletons announce with `aria-busy="true"`.

**Implemented — popup**

- Portal, focus trap and focus restoration from MUI.
- Always has an accessible name: title, `ariaLabel`, or a visually-hidden `<h2>`.
- `aria-describedby` when a description exists.
- Drawer paper carries `role="dialog"` and `aria-modal`.

**Responsive**

- Card: `width: 100%` by default (`appearance.responsive`); `expanded` sets a
  320px min height; minimised is `calc(100vw - 32px)` on xs, 360px from sm.
- Popup: dialog `maxWidth` maps `small→sm`, `medium→md`, `large→lg`;
  `full-screen` sets `fullScreen`. Drawer is `100vw` on xs and its size width
  from sm, so a drawer never exceeds the viewport.

**Limitation.** Hover motion under the glass themes is cancelled by default and
`hoverAnimation` opts back in, but neither path consults
`prefers-reduced-motion`.
**Recommended:** gate the lift/tilt on the media query.

**Limitation.** A minimised card is `position: fixed` in a corner. Several
minimised cards **stack on top of each other** — `minimizedRight`/`minimizedBottom`
exist but nothing coordinates them automatically.

---

## 10. Best-practice justification

| Practice                              | Code evidence                                        | Justification                                                                                                                                                                           | Trade-off                                                                 |
| ------------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| **Grouped config props**              | `header` / `state` / `appearance` / `windowControls` | ~30 related settings stay legible; call sites read as declarations.                                                                                                                     | Defeats `React.memo` — see below.                                         |
| **Slots over more props**             | `GenericCardSlots` (6), `GenericPopupSlots` (3)      | Any region can be replaced without a new prop for every variation.                                                                                                                      | Two ways to supply a body (`children` or `slots.body`).                   |
| **State priority centralised**        | `resolveBody` (`GenericCard.tsx:189`)                | Every card behaves the same when loading or failing; impossible to render two states at once.                                                                                           | Priority is fixed; a caller wanting error-over-loading must not set both. |
| **Defaults with per-state overrides** | `slots?.loading ?? <LoadingState/>`                  | Sensible defaults, no ceiling.                                                                                                                                                          | —                                                                         |
| **Controlled _or_ uncontrolled**      | `useControllableBoolean` (`GenericCard.tsx:45`)      | One component serves both; no "controlled variant".                                                                                                                                     | Two sources of truth to reason about.                                     |
| **Close policy as data**              | `isCloseBlocked` (`GenericPopup.tsx:218`)            | The rule is one readable function; adding a condition is one line.                                                                                                                      | Callers must learn the flag names.                                        |
| **Mutually exclusive actions**        | `{ formId } \| { onConfirm }` union                  | Supplying both is a compile error, not a runtime coin-toss.                                                                                                                             | Slightly harder to read than two optional props.                          |
| **Accessibility delegated to MUI**    | `Dialog`/`Drawer`                                    | Focus trapping and restoration are notoriously hard; MUI already solved them.                                                                                                           | Inherits MUI's behaviour, including its quirks.                           |
| **Never unnamed**                     | visually-hidden `<h2>` fallback                      | A dialog with no accessible name is announced as "dialog" and nothing else.                                                                                                             | An extra always-rendered node.                                            |
| **Nested-control detection**          | `isInteractiveTarget`                                | A button inside a clickable card does not double-fire.                                                                                                                                  | Selector-based; an exotic custom control may need adding.                 |
| **Guarded theme tokens**              | `glassIsEnabled` (`GenericCard.tsx:248`)             | Renders on a bare MUI theme instead of throwing — a real bug, now regression-tested.                                                                                                    | One indirection per token read.                                           |
| **Deliberately un-memoised**          | No `memo`/`useMemo` in either component              | **Measured** with the React Profiler: `React.memo` changed the median update from 8.37 ms to 8.12 ms across 40 cards — noise, because inline config objects fail every shallow compare. | Callers with hot lists must hoist their config objects to benefit.        |

### The memoisation decision, in full

Documented in `GenericCard/README.md` with the measurements:

| Variant                                      | Median update (40 cards, 20 updates) |
| -------------------------------------------- | ------------------------------------ |
| As shipped                                   | 8.37 ms (~0.21 ms/card)              |
| Wrapped in `React.memo`                      | 8.12 ms                              |
| `React.memo` + stable props at the call site | **0 renders**                        |

Memoising `buildCardSx` was tested and rejected too: MUI re-runs
`styleFunctionSx` on every render regardless of `sx` identity, so a stable
reference measured 0.90 ms vs 0.84 ms — nothing.

**Inferred.** The real lever is the caller hoisting its config objects. The
grouped-props API makes that awkward, which is the honest cost of the ergonomics.

---

## 11. Testing

| File                    | Tests | Covers                                                                                                                                                                                                                   |
| ----------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `GenericCard.test.tsx`  | 7     | Structured header + slots; state priority; retry delegation; keyboard activation vs nested controls; minimise/restore; disabled blocks pointer **and** keyboard; **all four surfaces on a bare MUI theme**               |
| `GenericPopup.test.tsx` | 7     | Portal rendering of parent content; confirm/cancel delegation; `formId` submit wiring; Escape and dirty-close policy; loading blocks close and disables actions; destructive + full-screen; drawer with dialog semantics |

**14 tests.** The surface test is the regression guard for the `theme.glass`
crash; the disabled test covers both input paths, because blocking only the mouse
would leave the card operable by keyboard.

```bash
cd frontend/react
pnpm exec vitest run src/components/GenericCard src/components/GenericPopup
```

**Limitation.** No test covers full-screen mode or `resizable`.
**Limitation.** No test asserts focus **restoration** after the popup closes —
MUI provides it, but the app does not verify it.

---

## 12. Limitations and trade-offs

| #   | Limitation                                                                                                                                                                                |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **`React.memo` is useless with the current API** (§10). Grouped inline objects fail shallow compare.                                                                                      |
| 2   | **Minimised cards do not auto-arrange** (§9).                                                                                                                                             |
| 3   | **No `prefers-reduced-motion` handling** for hover motion.                                                                                                                                |
| 4   | **Card state priority is fixed** — loading beats error beats empty.                                                                                                                       |
| 5   | **`accent` surface suits text, not inputs.** Opaque form fields on the gradient read as a coloured frame; the Quick note card was changed to the default surface for exactly this reason. |
| 6   | **Popup has no built-in loading/empty/error** — deliberate, but a caller wanting them writes them again.                                                                                  |
| 7   | **`resizable` uses CSS `resize`**, which is not keyboard accessible.                                                                                                                      |
| 8   | **Full-screen cards use `zIndex: modal + 1`**, so a card above an open dialog is possible.                                                                                                |
| 9   | **Two ways to pass a body** (`children` vs `slots.body`); `slots.body` wins.                                                                                                              |
| 10  | **No focus-restoration test** (§11).                                                                                                                                                      |

---

## 13. Extension guide

### A new card state

1. Add fields to `GenericCardStateConfig`.
2. Add a default renderer beside `LoadingState` / `ErrorState` / `EmptyState`.
3. Insert it into `resolveBody` **in priority order** — position is the semantics.
4. Add a slot key so callers can override it.

### A new surface

1. Extend `GenericCardSurface`.
2. Add a branch in `buildCardSx`.
3. Read theme tokens **through `glassIsEnabled`**, never directly.
4. Extend the bare-theme test to cover it.

### A new popup close rule

One line in `isCloseBlocked`, plus a flag on `GenericPopupCloseBehavior`.
Nothing else changes.

### Getting memo to pay off in a hot list

```tsx
const HEADER = { title: 'Row', icon: <Icon /> }; // module scope
const APPEARANCE = { size: 'compact' } as const;
const MemoCard = memo(GenericCard);

<MemoCard header={HEADER} appearance={APPEARANCE}>
  {stableChild}
</MemoCard>;
```

Only worth doing where a profile shows it matters — the measured baseline is
~0.21 ms per card.

---

## 14. Evidence index

| Claim                           | File                                                         | Line  |
| ------------------------------- | ------------------------------------------------------------ | ----- |
| Card prop contract              | `frontend/react/src/components/GenericCard/GenericCard.types.ts`   | 74    |
| Header config                   | `frontend/react/src/components/GenericCard/GenericCard.types.ts`   | 8     |
| State config                    | `frontend/react/src/components/GenericCard/GenericCard.types.ts`   | 20    |
| Appearance config               | `frontend/react/src/components/GenericCard/GenericCard.types.ts`   | 33    |
| Window controls                 | `frontend/react/src/components/GenericCard/GenericCard.types.ts`   | 46    |
| Slots                           | `frontend/react/src/components/GenericCard/GenericCard.types.ts`   | 65    |
| Controlled-or-uncontrolled hook | `frontend/react/src/components/GenericCard/GenericCard.tsx`        | 45    |
| Nested-control detection        | `frontend/react/src/components/GenericCard/GenericCard.tsx`        | 61    |
| State priority                  | `frontend/react/src/components/GenericCard/GenericCard.tsx`        | 189   |
| Surface builder                 | `frontend/react/src/components/GenericCard/GenericCard.tsx`        | 202   |
| Guarded theme tokens            | `frontend/react/src/components/GenericCard/GenericCard.tsx`        | 248   |
| Memoisation measurements        | `frontend/react/src/components/GenericCard/README.md`              | —     |
| Popup prop contract             | `frontend/react/src/components/GenericPopup/GenericPopup.types.ts` | 46    |
| Actions union                   | `frontend/react/src/components/GenericPopup/GenericPopup.types.ts` | 28    |
| Close behaviour config          | `frontend/react/src/components/GenericPopup/GenericPopup.types.ts` | 31    |
| Close policy function           | `frontend/react/src/components/GenericPopup/GenericPopup.tsx`      | 218   |
| Popup component                 | `frontend/react/src/components/GenericPopup/GenericPopup.tsx`      | 235   |
| Hidden title fallback           | `frontend/react/src/components/GenericPopup/GenericPopup.tsx`      | 112   |
| Drawer dialog semantics         | `frontend/react/src/components/GenericPopup/GenericPopup.tsx`      | 304   |
| Card tests                      | `frontend/react/src/components/GenericCard/GenericCard.test.tsx`   | 9–113 |
| Popup tests                     | `frontend/react/src/components/GenericPopup/GenericPopup.test.tsx` | 8–142 |
