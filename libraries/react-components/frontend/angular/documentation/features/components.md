# Shared components

## GenericCard

[`generic-card/`](../../src/app/shared/generic-card/)

React's grouped config objects (`header={{...}}`, `appearance={{...}}`) became
flat signal `input()`s. Slots (`ReactNode` props) became
`<ng-content select="[card-*]">`: `card-header-action`, `card-footer`.

**One place decides state precedence**, so every card in the app behaves
identically and two states can never render at once:

```ts
protected readonly state = computed<'loading' | 'error' | 'empty' | 'content'>(() => {
  if (this.loading()) return 'loading';
  if (this.error() !== null) return 'error';
  if (this.empty()) return 'empty';
  return 'content';
});
```

**Trap.** The card's loading state *replaces its content*. Putting `[loading]`
on a card wrapping a grid tears the grid down and rebuilds it on every refetch.
Grid pages put `loading` on the grid, which has its own overlay.

**Verified**: all four states, on four cards driven from one toggle.

## GenericPopup

[`generic-popup/`](../../src/app/shared/generic-popup/)

`MatDialog` already owns opening, the portal, the focus trap, focus restoration
and `aria-modal`. React's `GenericPopup` re-implemented all of that; this
component is only the *content* — header, body slot, action footer.

What survives the port is the part MatDialog does not provide: the **close
policy** ([`close-policy.ts`](../../src/app/shared/generic-popup/close-policy.ts)),
one pure function instead of `if`s spread across handlers.

```ts
isCloseBlocked(reason, behavior, loading): boolean
```

Two defaults worth knowing:

- **Closing is blocked while loading unless you opt out.** A dialog dismissed
  mid-save leaves the user unsure whether their change landed.
- **`dirty` alone does not block.** It is a fact about the dialog; refusing is a
  separate decision (`preventCloseWhenDirty`). Plenty of dialogs want to track
  dirtiness without trapping the user in it.

### Openers must pass `disableClose: true`

Otherwise MatDialog's own Escape and backdrop handling closes the dialog
**before this component sees the event**, and a dirty dialog vanishes. That was
a real bug: the buttons honoured the policy and Escape did not, which is worse
than having no policy at all. Escape and backdrop are now routed through
`attemptClose` from the constructor, via `takeUntilDestroyed()`.

Also deliberate: `closeOnBackdrop: false` / `closeOnEscape: false` **never**
block Cancel or the close button. Those options exist to stop *accidental*
dismissal; letting them disable the deliberate exits would leave a dialog with
no way out. Tested.

**Verified**: Escape closes a clean dialog; Escape on a dirty one is refused
with a snackbar naming the reason; Confirm closes.

## GenericChart

[`generic-chart/`](../../src/app/shared/generic-chart/)

Library-agnostic shell; Highcharts is confined to the option builder. Feature
code depends on `ChartSeries`/`ChartPoint`, never on `Highcharts.Options`.

### Accessibility — do not regress this

The React implementation shipped with a defect worth repeating so it is not
reintroduced:

1. The accessibility module was **disabled**, so charts had no keyboard
   navigation at all.
2. The wrapper used `role="img"`, which collapses the entire subtree into a
   single opaque image. Enabling the module alone did **not** help, because
   every per-point node stayed hidden behind that role.

So: the module is loaded by the app-level `provideHighcharts` — no caller can
forget it — and the wrapper is a labelled **`role="group"`, never `role="img"`**.
Over-configuring `keyboardNavigation.seriesNavigation` silently disabled point
navigation in React, so only the focus-border colour is overridden.

**Verified**: `role="group"`, `tabindex="0"`, screen-reader region reading
"Combination chart with 2 data series…", per-point announcements.

### Module loading: one loader, and the order matters

Two separate defects, both surfacing as the same message —
*"Failed to load Highcharts modules"* — and both fixed in
[`app.config.ts`](../../src/app/app.config.ts).

**1. The loader must be app-level.** `providePartialHighcharts` on the component
put one module loader on *every* chart instance. A page with three charts raced
them and every chart failed. One root loader cannot race itself.

**2. `exporting` must load before its dependents.** `offline-exporting` and
`export-data` extend the class that `exporting` installs. Started in parallel
they can evaluate first and throw
*"Cannot read properties of undefined (reading 'prototype')"*. They are now
chained after it. Each module also chains off a single memoised core promise,
because a Highcharts ESM module opens with
`import * as t from '../highcharts.js'` and reads `t.default` at evaluation time.

> **This one only appeared in a production build.** The dev server happened to
> evaluate the modules in a working order for the whole of development; the
> container did not, and the chart silently rendered nothing. It was found by
> running the built image, not by reading the code — and the first "fix"
> (switching to the non-`esm/` entry points) made it fail *consistently* rather
> than intermittently, which is how the real cause became visible.

Both the instance and the modules remain dynamic imports, so lazy loading is
preserved.

**Verified** in the container across the three chart pages: 1, 2 and 3 charts,
correct series counts, screen-reader region present, `role="group"` intact, no
console errors.

### Other notes

- `area` series get `fillOpacity: 0.3`. Opaque fills make the series drawn last
  hide everything under it, so an overlapping area chart reads as one series.
- Exporting is offline (`fallbackToExportServer: false`): chart data never
  leaves the browser to be rendered.

## Snackbar

[`snackbar.service.ts`](../../src/app/shared/snackbar/snackbar.service.ts) —
variants, action buttons, auto-hide control, anchor position.

A snackbar that neither auto-hides nor has a button cannot be closed at all, so
the dismiss button is forced back on in that case.

React needed a module-level event bus so plain TypeScript could raise a toast.
DI deleted it. [`background-job.ts`](../../src/app/features/admin/background-job.ts)
demonstrates a service raising one with no component involved.

## PageContainer and AccentCard

[`page-container/`](../../src/app/shared/page-container/) — constrained width,
title/subtitle, an optional `page-action` slot.

[`accent-card/`](../../src/app/shared/accent-card/) — what survives React's
`GlassCard`. The glassmorphism theme styles were MUI `sx` constructs with no
Material equivalent; what carries meaning is the accent stripe and the
interactive affordance. Hover lift honours `prefers-reduced-motion`.

`interactive` uses `booleanAttribute` so callers write a bare `interactive`
rather than `[interactive]="true"`.
