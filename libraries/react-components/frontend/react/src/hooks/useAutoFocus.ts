import { useEffect, useRef } from 'react';

/**
 * Focus an element as soon as it mounts.
 *
 * For grid cell editors this is not a nicety: the user has just double-clicked
 * a cell, the editor mounts in response, and without focus their next
 * keystroke goes nowhere. Removing the behaviour would break inline editing.
 *
 * Expressed here rather than with the `autoFocus` JSX attribute so that
 * `jsx-a11y/no-autofocus` stays meaningful across the codebase. That rule
 * exists to catch focus jumping somewhere the user did not ask it to go —
 * typically on page load. Focusing a widget the user just opened is the
 * opposite case, and stating it as an effect makes the intent explicit.
 *
 * Pass `enabled: false` to opt out (some editors expose it as a prop).
 *
 * The type parameter is constrained to "something focusable" rather than
 * `HTMLElement`, because MUI's `Select` hands its `inputRef` an imperative
 * handle — `{ focus() }` targeting the display node — rather than a DOM node.
 */
export function useAutoFocus<T extends { focus: () => void }>(enabled = true) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (enabled) ref.current?.focus();
  }, [enabled]);

  return ref;
}
