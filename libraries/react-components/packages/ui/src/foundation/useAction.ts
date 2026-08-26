import { useActionState } from 'react';

import { IDLE, toFailure, type ActionResult } from './mutation';

/**
 * `useActionState`, narrowed to this library's result contract.
 *
 * React 19's Action model is what makes this worth wrapping: the pending flag
 * is managed for us, the state update is a transition, and the result is
 * ordinary state rather than an exception. The wrapper adds two things:
 *
 * - anything thrown becomes a `status: 'error'` result, so a rejected promise
 *   cannot unmount the tree through an error boundary;
 * - the action may return an `ActionResult` directly when it wants to express
 *   a conflict or field errors.
 *
 * ```tsx
 * const [result, apply, pending] = useAction(async (_prev, code: string) => {
 *   const discount = await api.applyCoupon(code);
 *   return { status: 'success', data: discount } as const;
 * });
 * ```
 */
export function useAction<TInput, TData>(
  action: (previous: ActionResult<TData>, input: TInput) => Promise<ActionResult<TData> | TData>,
  initial: ActionResult<TData> = IDLE,
): readonly [ActionResult<TData>, (input: TInput) => void, boolean] {
  const [state, dispatch, pending] = useActionState<ActionResult<TData>, TInput>(
    async (previous, input) => {
      try {
        const outcome = await action(previous, input);
        // A bare value is the common case ("here is the new thing"); a full
        // result is the escape hatch for conflicts and field errors.
        if (
          typeof outcome === 'object' &&
          outcome !== null &&
          'status' in outcome &&
          typeof (outcome as { status: unknown }).status === 'string'
        ) {
          return outcome;
        }
        return { status: 'success', data: outcome as TData };
      } catch (error) {
        return toFailure(error);
      }
    },
    initial,
  );

  return [state, dispatch, pending] as const;
}
