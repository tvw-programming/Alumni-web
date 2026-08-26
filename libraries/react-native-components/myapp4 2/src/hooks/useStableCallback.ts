import { useCallback, useRef } from 'react';

/**
 * Identity-stable wrapper around a changing callback. Lets list rows stay
 * `React.memo`-clean even when the parent re-creates handlers every render.
 */
export function useStableCallback<A extends unknown[], R>(
  fn: ((...args: A) => R) | undefined,
): (...args: A) => R | undefined {
  const ref = useRef(fn);
  ref.current = fn;
  return useCallback((...args: A) => ref.current?.(...args), []);
}
