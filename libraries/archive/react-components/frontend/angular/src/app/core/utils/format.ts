export const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

export function capitalize(value: string): string {
  return value.length > 0 ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

/**
 * String form of a loosely-typed cell or preference value, for display,
 * filtering and comparison.
 *
 * Grid cells, filter fields and preference specs all carry `unknown` values,
 * and a bare `String(value)` on one turns a plain object into
 * `'[object Object]'`. In a filter dropdown that is worse than useless: every
 * object-valued row collapses into a single identical option which then
 * matches all of them. Such values are treated as absent instead.
 *
 * Values whose string form is meaningful keep it — `Date` and arrays define
 * their own `toString`, so they render exactly as before. `NaN` and `Infinity`
 * are treated as absent rather than rendered as the text "NaN"/"Infinity".
 */
export function toDisplayString(value: unknown): string {
  if (value === null || value === undefined) return '';

  switch (typeof value) {
    case 'string':
      return value;
    case 'number':
      return Number.isFinite(value) ? String(value) : '';
    case 'boolean':
    case 'bigint':
      return String(value);
    case 'symbol':
    case 'function':
      return '';
    case 'object': {
      const ownToString: unknown = (value as { toString?: unknown }).toString;

      // Inheriting Object.prototype.toString means '[object Object]'. A
      // null-prototype object has no toString at all, and String() on one
      // throws — neither is something to render.
      if (typeof ownToString !== 'function' || ownToString === Object.prototype.toString) {
        return '';
      }

      // eslint-disable-next-line @typescript-eslint/no-base-to-string -- guarded above
      return String(value);
    }
    default:
      // `typeof` on an `unknown` still admits 'undefined' as far as the
      // compiler is concerned, despite the guard at the top.
      return '';
  }
}
