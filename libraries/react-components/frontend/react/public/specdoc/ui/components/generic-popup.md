## Component Specification

### Name & Purpose

`GenericPopup` — dialog and drawer shell. Owns the **close policy**: whether a
dirty or in-flight dialog may close, and what the parent is told when it may not.

### Location

`src/components/GenericPopup/` — `GenericPopup.tsx`, `GenericPopup.types.ts`, `index.ts`

### Public Interface

```ts
type PopupCloseReason = 'backdrop' | 'escape' | 'close-button' | 'cancel';

interface PopupCloseBehavior {
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  preventCloseWhenDirty?: boolean;
  dirty?: boolean;
  preventCloseWhileLoading?: boolean; // defaults to true when loading
}

// Defined in GenericPopup.tsx. The Angular port extracts the same logic
// into shared/generic-popup/close-policy.ts.
export function isCloseBlocked(
  reason: PopupCloseReason,
  behavior: PopupCloseBehavior,
  loading: boolean,
): boolean;
```

### Dependencies

- Internal: none.
- External: MUI (`Dialog`, `Drawer`).

### Data Models

None.

### Business Rules & Constraints

**One pure function instead of `if`s spread across handlers** — that is what
makes the policy legible and testable.

Two defaults worth knowing:

- **Closing is blocked while loading unless the caller opts out.** A dialog
  dismissed mid-save leaves the user unsure whether their change landed.
- **`dirty` alone does not block.** It is a fact about the dialog; refusing is a
  separate decision (`preventCloseWhenDirty`). Plenty of dialogs track dirtiness
  without trapping the user in it.

**`closeOnBackdrop: false` / `closeOnEscape: false` never block Cancel or the
close button.** Those options exist to stop _accidental_ dismissal; letting them
disable the deliberate exits would leave a dialog with no way out.

### Extension Points

- **A new close route:** add to `PopupCloseReason` and handle it in
  `isCloseBlocked`. TypeScript finds every switch.
- **A new policy rule:** a field on `PopupCloseBehavior` and a line in
  `isCloseBlocked`. The Angular app has its own copy in
  `shared/generic-popup/close-policy.ts` — change both.
