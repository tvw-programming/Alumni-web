/**
 * The contract every mutation in this library returns.
 *
 * One shape for every domain, because the components that render a result — a
 * helper text, a snackbar, a rolled-back row — should not need to know which
 * service produced it.
 */

export type MutationStatus = 'idle' | 'pending' | 'success' | 'error' | 'offline' | 'conflict';

export interface MutationError {
  readonly code: string;
  readonly message: string;
  /** Keyed by field name, so a form can put the message beside the input. */
  readonly fieldErrors?: Record<string, string>;
}

export interface MutationResult<T> {
  readonly status: MutationStatus;
  readonly data?: T;
  readonly error?: MutationError;
  /** Echoed from the server, so a screenshot of a failure is traceable. */
  readonly requestId?: string;
}

/**
 * What `useAction` exposes to a component.
 *
 * `idle` and `pending` carry no data on purpose: a component that renders
 * `data` while pending is rendering the *previous* result, which is how a stale
 * total ends up on a confirmation screen.
 */
/**
 * A failed outcome.
 *
 * Named rather than inlined in the union: `Extract<ActionResult<T>, { status:
 * "error" }>` collapses to `never`, because this member's `status` is itself a
 * union and so does not extend the narrower literal. Guards return this type.
 */
export interface ActionFailure {
  readonly status: 'error' | 'conflict' | 'offline';
  readonly message: string;
  readonly code?: string;
  readonly fieldErrors?: Record<string, string>;
  readonly requestId?: string;
}

export type ActionResult<T> =
  | { readonly status: 'idle' | 'pending' }
  | { readonly status: 'success'; readonly data: T }
  | ActionFailure;

export const IDLE: ActionResult<never> = { status: 'idle' };

export function isSettled<T>(result: ActionResult<T>): boolean {
  return result.status !== 'idle' && result.status !== 'pending';
}

export function isFailure<T>(result: ActionResult<T>): result is ActionFailure {
  return result.status === 'error' || result.status === 'conflict' || result.status === 'offline';
}

export function fieldError<T>(result: ActionResult<T>, field: string): string | undefined {
  return isFailure(result) ? result.fieldErrors?.[field] : undefined;
}

/**
 * Turns anything thrown into an `ActionResult`.
 *
 * A rejected promise is not a crash here — a failed mutation is an ordinary
 * outcome, and the component needs it as state rather than as an exception that
 * unmounts the tree.
 */
export function toFailure(error: unknown): ActionFailure {
  if (typeof error === 'object' && error !== null) {
    const candidate = error as {
      code?: unknown;
      message?: unknown;
      fieldErrors?: unknown;
      requestId?: unknown;
    };
    return {
      status: 'error',
      code: typeof candidate.code === 'string' ? candidate.code : undefined,
      message: typeof candidate.message === 'string' ? candidate.message : 'Something went wrong.',
      fieldErrors:
        typeof candidate.fieldErrors === 'object' && candidate.fieldErrors !== null
          ? (candidate.fieldErrors as Record<string, string>)
          : undefined,
      requestId: typeof candidate.requestId === 'string' ? candidate.requestId : undefined,
    };
  }
  return { status: 'error', message: 'Something went wrong.' };
}

/**
 * A conflict is not an error the user caused.
 *
 * It means the server's copy moved on — a price changed, a slot was taken, a
 * row was edited. The UI response is "here is the new truth", not "try again".
 */
export function conflict(message: string, code = 'CONFLICT'): ActionFailure {
  return { status: 'conflict', message, code };
}

/** Generates an idempotency key so a retried mutation cannot double-apply. */
export function newRequestId(): string {
  return globalThis.crypto.randomUUID();
}
