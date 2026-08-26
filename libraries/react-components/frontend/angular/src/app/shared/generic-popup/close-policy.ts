export type PopupCloseReason = 'backdrop' | 'escape' | 'close-button' | 'cancel';

export interface PopupCloseBehavior {
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  preventCloseWhenDirty?: boolean;
  dirty?: boolean;
  /** Defaults to true when the dialog is loading. */
  preventCloseWhileLoading?: boolean;
}

/**
 * Whether a close attempt should be refused.
 *
 * Ported verbatim from the React app: one pure function instead of `if`s spread
 * across handlers, which is what makes the policy legible and testable.
 *
 * Note the default — **closing is blocked while loading unless you opt out**.
 * That is the safe direction: a dialog dismissed mid-save leaves the user
 * unsure whether their change landed.
 */
export function isCloseBlocked(
  reason: PopupCloseReason,
  behavior: PopupCloseBehavior,
  loading: boolean,
): boolean {
  if (loading && (behavior.preventCloseWhileLoading ?? true)) return true;
  if (behavior.dirty && behavior.preventCloseWhenDirty) return true;
  if (reason === 'backdrop' && behavior.closeOnBackdrop === false) return true;
  if (reason === 'escape' && behavior.closeOnEscape === false) return true;
  return false;
}
