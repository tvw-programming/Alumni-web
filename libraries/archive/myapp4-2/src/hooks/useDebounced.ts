import { useCallback, useEffect, useRef, useState } from 'react';

/** Debounced mirror of a value — for search-as-you-type. */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    if (delayMs <= 0) {
      setDebounced(value);
      return;
    }
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

/**
 * Leading-edge throttle used to make destructive/expensive taps idempotent
 * (double-tapped "Pay" buttons are a real production bug, not a hypothetical).
 */
export function useThrottledCallback<A extends unknown[]>(
  fn: ((...args: A) => void) | undefined,
  windowMs: number,
): (...args: A) => void {
  const lastRun = useRef(0);
  const ref = useRef(fn);
  ref.current = fn;

  return useCallback(
    (...args: A) => {
      const now = Date.now();
      if (windowMs > 0 && now - lastRun.current < windowMs) return;
      lastRun.current = now;
      ref.current?.(...args);
    },
    [windowMs],
  );
}
