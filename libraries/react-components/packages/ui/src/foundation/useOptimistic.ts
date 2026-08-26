import { useOptimistic, useTransition } from 'react';

/**
 * An optimistic value with a commit function.
 *
 * `useOptimistic` only shows the predicted value while a transition is running;
 * React discards it and re-renders from the authoritative prop the moment the
 * Action settles — which is precisely the rollback behaviour optimistic UI
 * normally has to hand-roll, and get wrong.
 *
 * The rule this library follows: predict what the user controls (a wishlist
 * toggle, a quantity, a read flag) and never predict what the server decides
 * (a price, a balance, a booking, a device acknowledgement).
 *
 * ```tsx
 * const [saved, toggleSaved, pending] = useOptimisticValue(product.saved, api.toggleSaved);
 * ```
 */
export function useOptimisticValue<T>(
  serverValue: T,
  commit: (next: T) => Promise<unknown>,
): readonly [T, (next: T) => void, boolean] {
  const [optimistic, setOptimistic] = useOptimistic(serverValue, (_current, next: T) => next);
  const [pending, startTransition] = useTransition();

  const apply = (next: T) => {
    // The optimistic write has to happen *inside* the transition, or React has
    // nothing to tie the predicted value to and it is dropped immediately.
    startTransition(async () => {
      setOptimistic(next);
      await commit(next);
    });
  };

  return [optimistic, apply, pending] as const;
}
