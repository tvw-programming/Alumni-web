import { toDisplayString } from '../../../core/utils/format';
import { isArrayValue } from '../../../core/utils/guards';

/**
 * Narrowing helpers for `FieldRendererProps.value`.
 *
 * Form state is schema-driven, so a renderer cannot know statically what shape
 * its value has — the field config is JSON, and `customRender` lets a schema
 * author supply an arbitrary widget. The contract therefore types values as
 * `unknown`, and every renderer converts once, here, into the shape its MUI
 * control needs. Previously the contract said `any`, which meant each renderer
 * silently assumed a shape and produced `[object Object]`, `NaN` or a React
 * controlled/uncontrolled warning when the assumption was wrong.
 */

/** Value for a controlled text-like input. */
export function asInputValue(value: unknown): string {
  return toDisplayString(value);
}

/** Value for a checkbox or switch. */
export function asChecked(value: unknown): boolean {
  return value === true || value === 'true';
}

/**
 * Value for a numeric control, or `null` when the field is empty or holds
 * something that is not a number.
 */
export function asNumberOrNull(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string' || value.trim() === '') return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Value for a numeric control that has no meaningful empty state. */
export function asNumber(value: unknown, fallback = 0): number {
  return asNumberOrNull(value) ?? fallback;
}

/**
 * Value for a multi-select, checkbox group or toggle group. Non-string
 * entries are dropped rather than rendered — a stray object would otherwise
 * become an unselectable `[object Object]` chip.
 */
export function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === 'string');
}

/** Value for a single-choice control (select, radio, toggle). */
export function asChoice(value: unknown): string {
  return typeof value === 'string' ? value : toDisplayString(value);
}

/**
 * A field type's registered `emptyValue`, ready to seed one form.
 *
 * Containers are cloned so two forms mounted from the same registry entry
 * never share an array instance — mutating one would silently change the
 * other. Missing values become `''` rather than `undefined`, which would make
 * React treat the input as uncontrolled on first render and then complain when
 * the first keystroke makes it controlled.
 */
export function cloneEmptyValue(empty: unknown): unknown {
  if (isArrayValue(empty)) return [...empty];
  return empty ?? '';
}

/**
 * Files held by a `file` field, which stores either one `File` or an array.
 *
 * Entries that are not `File` instances are dropped. The previous inline
 * version asserted `File[]` without checking, so anything else in form state
 * reached `.size` and `.name` and threw at validation time.
 */
export function asFileArray(value: unknown): File[] {
  if (value instanceof File) return [value];
  if (!isArrayValue(value)) return [];
  return value.filter((entry): entry is File => entry instanceof File);
}
