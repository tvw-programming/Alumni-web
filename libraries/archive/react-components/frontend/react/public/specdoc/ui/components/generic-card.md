## Component Specification

### Name & Purpose

`GenericCard` — the surface every panel in the app is built on. Owns the
loading / error / empty / content state machine so no two states can render at
once.

### Location

`src/components/GenericCard/` — `GenericCard.tsx`, `GenericCard.types.ts`, `index.ts`

### Public Interface

```tsx
interface GenericCardProps {
  header?: {
    title?: ReactNode;
    subtitle?: ReactNode;
    icon?: ReactNode;
    badge?: ReactNode;
    action?: ReactNode;
  };
  state?: {
    loading?: boolean;
    error?: ReactNode;
    empty?: boolean;
    emptyMessage?: ReactNode;
    emptyIcon?: ReactNode;
    onRetry?: () => void;
    retryLabel?: string;
  };
  appearance?: {
    surface?: 'default' | 'subtle' | 'glass';
    size?: 'compact' | 'regular' | 'expanded';
    hoverAnimation?: boolean;
    accent?: GlassAccent;
  };
  slots?: { footer?: ReactNode; media?: ReactNode };
  metric?: ReactNode;
  disabled?: boolean;
  children?: ReactNode;
}
```

### Dependencies

- Internal: theme context, `glassAccents`.
- External: MUI.

### Data Models

None — presentational.

### Business Rules & Constraints

**One place decides state precedence**, so every card in the app behaves
identically:

```
loading → error → empty → content
```

- **The loading state replaces the content.** Putting `loading` on a card that
  wraps a grid tears the grid down and rebuilds it on every refetch — grid pages
  put `loading` on the grid, which has its own overlay.
- **`onRetry` is what renders the retry button**; without a handler there is none.
- **Props are grouped objects** (`header`, `state`, `appearance`, `slots`). The
  Angular port flattens these into individual signal inputs, because that is
  idiomatic there — the two APIs differ deliberately.

### Extension Points

- **A new state:** add to the precedence chain in one place; every card gains it.
- **A new surface style:** the `appearance.surface` union plus its style branch.
- **A new slot:** add to `slots`; Angular uses `<ng-content select="[card-*]">`
  for the same purpose.
