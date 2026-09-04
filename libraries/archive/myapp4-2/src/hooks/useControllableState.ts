import { useCallback, useRef, useState } from 'react';

export interface ControllableStateOptions<T> {
  /** Controlled value. When provided, the component never owns the state. */
  value?: T;
  /** Uncontrolled seed. Read once. */
  defaultValue: T;
  onChange?: (next: T) => void;
}

type Updater<T> = T | ((prev: T) => T);

/**
 * One hook so every input-like component supports controlled *and* uncontrolled
 * use without each author re-inventing (and subtly breaking) the pattern.
 */
export function useControllableState<T>({
  value,
  defaultValue,
  onChange,
}: ControllableStateOptions<T>): [T, (next: Updater<T>) => void] {
  const [uncontrolled, setUncontrolled] = useState<T>(defaultValue);
  const isControlled = value !== undefined;
  const current = isControlled ? (value as T) : uncontrolled;

  // Keep the latest value in a ref so the setter identity stays stable.
  const currentRef = useRef(current);
  currentRef.current = current;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const controlledRef = useRef(isControlled);
  controlledRef.current = isControlled;

  const setValue = useCallback((next: Updater<T>) => {
    const resolved =
      typeof next === 'function' ? (next as (prev: T) => T)(currentRef.current) : next;
    if (Object.is(resolved, currentRef.current)) return;
    if (!controlledRef.current) setUncontrolled(resolved);
    onChangeRef.current?.(resolved);
  }, []);

  return [current, setValue];
}
