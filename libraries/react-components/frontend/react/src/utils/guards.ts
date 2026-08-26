/**
 * `Array.isArray` is declared as `value is any[]`, so narrowing an `unknown`
 * through it hands back `any` and every subsequent read is unchecked. This
 * predicate says the same thing soundly.
 */
export function isArrayValue(value: unknown): value is readonly unknown[] {
  return Array.isArray(value);
}
