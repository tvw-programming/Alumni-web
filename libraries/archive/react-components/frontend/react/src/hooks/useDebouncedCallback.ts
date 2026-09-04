import { useCallback, useEffect, useMemo, useRef } from 'react';

/**
 * Debounces a *side-effect* callback.
 *
 * Deliberately NOT used for the form engine's own field value updates —
 * debouncing form state would make the input visibly lag behind the
 * keystroke and break controlled-input behaviour. Only consumer callbacks
 * (`onCustomChange`) go through here.
 *
 * The latest callback is held in a ref, so a fresh inline arrow from the
 * parent on every render does not reset the pending timer.
 *
 * `delay <= 0` returns a pass-through: zero timers, zero overhead.
 */
export function useDebouncedCallback<A extends unknown[]>(
  callback: ((...args: A) => void) | undefined,
  delay: number,
): (...args: A) => void {
  const callbackRef = useRef(callback);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep the ref current without invalidating the returned function identity.
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const cancel = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Cancel any in-flight timer on unmount so we never fire into a dead tree.
  useEffect(() => cancel, [cancel]);

  return useMemo(() => {
    if (!delay || delay <= 0) {
      return (...args: A) => callbackRef.current?.(...args);
    }
    return (...args: A) => {
      cancel();
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        callbackRef.current?.(...args);
      }, delay);
    };
  }, [delay, cancel]);
}
