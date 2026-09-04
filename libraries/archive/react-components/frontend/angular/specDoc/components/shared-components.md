## Component Specification

### Name & Purpose
`GenericCard`, `GenericPopup`, `GenericChart`, `SnackbarService`, plus the small
layout shells. The reusable UI surface, with no feature knowledge.

### Location
`src/app/shared/` — `generic-card/`, `generic-popup/`, `generic-chart/`,
`snackbar/`, `page-container/`, `accent-card/`, `api/`

### Public Interface

```ts
// GenericCard — React's grouped config objects became flat signal inputs
export class GenericCard {
  readonly title, subtitle, icon, metric: InputSignal<string | undefined>;
  readonly loading = input(false);
  readonly error = input<string | null>(null);
  readonly empty = input(false);
  readonly emptyMessage = input('Nothing here yet');
  readonly emptyIcon = input('inbox');
  readonly errorTitle = input('Unable to load');
  readonly retryLabel = input('Retry');
  readonly showRetry = input(false);
  readonly surface = input<'default' | 'subtle' | 'accent'>('default');
  readonly size = input<'compact' | 'regular' | 'expanded'>('regular');
  readonly disabled = input(false);
  readonly retry = output<void>();
}
// Slots: [card-header-action], [card-footer], default content.

// GenericPopup — content only; MatDialog owns opening, focus trap, restore
export class GenericPopup {
  readonly title, description, icon: InputSignal<string | undefined>;
  readonly mode = input<'default' | 'warning' | 'destructive'>('default');
  readonly confirmLabel, cancelLabel, loadingLabel: InputSignal<string>;
  readonly loading, confirmDisabled, hideCancel, showCloseButton: InputSignal<boolean>;
  readonly closeBehavior = model<PopupCloseBehavior>({});   // two-way
  readonly confirm = output<void>();
  readonly blockedClose = output<PopupCloseReason>();
}

// GenericChart — same ChartSeries contract as React
export class GenericChart<TMetadata = unknown> {
  readonly series = input.required<readonly ChartSeries<TMetadata>[]>();
  readonly title, subtitle, ariaLabel: InputSignal<string | undefined>;
  readonly height = input(320);
  readonly interactive, legendVisible, multiColor, exportEnabled: InputSignal<boolean>;
  readonly loading = input(false);
  readonly error = input<string | null>(null);
  readonly pointClick = output<ChartPointEvent<TMetadata>>();
}

// SnackbarService
success(message, options?) / info / warning / error
interface SnackbarOptions {
  action?: { label: string; onClick: () => void };
  duration?: number | null;     // null = stay until dismissed
  dismissible?: boolean;
  vertical?: MatSnackBarVerticalPosition;
  horizontal?: MatSnackBarHorizontalPosition;
}
```

### Dependencies
- Internal: `ThemeStore`, `close-policy.ts`.
- External: Angular Material, `highcharts-angular`.

### Data Models
None persisted. `close-policy.ts` and `chart.types.ts` are ports of the React
files.

### Business Rules & Constraints

**GenericCard** — one `computed` decides precedence
(`loading → error → empty → content`). The loading state **replaces** the
content, so grid pages put `loading` on the grid, not the card.

**GenericPopup — openers must pass `disableClose: true`:**

```ts
this.dialog.open(DemoDialog, { data, disableClose: true });
```

Otherwise MatDialog's own Escape and backdrop handling closes the dialog *before*
this component sees the event, and a dirty dialog vanishes. Both are routed
through `attemptClose` from the constructor via `takeUntilDestroyed()` — two of
the app's four sanctioned `.subscribe()` calls.

**`dirty` alone does not block**; `preventCloseWhenDirty` is the opt-in. And
`closeOnBackdrop:false` / `closeOnEscape:false` never block Cancel or the close
button — those exist to stop accidental dismissal, not to trap the user.

**GenericChart accessibility — do not regress.** `role="group"`, **never**
`role="img"`; the accessibility module is loaded by the app-level
`provideHighcharts` so no caller can forget it.

**Highcharts module loading is app-level and *ordered*:**

```ts
provideHighcharts({
  instance: () => loadHighchartsCore(),
  modules: () => [
    loadHighchartsCore().then(() => import('highcharts/esm/modules/accessibility')),
    loadHighchartsCore()
      .then(() => import('highcharts/esm/modules/exporting'))
      .then(async (exporting) => {
        await import('highcharts/esm/modules/offline-exporting');
        await import('highcharts/esm/modules/export-data');
        return exporting;
      }),
  ],
});
```

Two defects, both reported as "Failed to load Highcharts modules":
1. A per-component loader meant three charts on a page raced each other.
2. `offline-exporting` and `export-data` extend the class `exporting` installs —
   started in parallel they throw `undefined.prototype`.

> **This only appeared in a production build.** The dev server happened to
> evaluate the modules in a working order for the whole of development; the
> container did not, and the chart silently rendered nothing.

**SnackbarService replaces React's module-level event bus.** DI made it
unnecessary — anything with an injector can inject it.

### Extension Points

- **A new card state:** the `state` computed; every card gains it.
- **A new close rule:** `close-policy.ts` — shared with React.
- **A new chart series type:** `ChartSeriesType` + a branch in the options builder.
- **A new snackbar capability:** `SnackbarOptions` + a line in `open`.
