import type { Facet, FilterState, RangeValue } from '../types/domain';

/**
 * Headless filter engine.
 *
 * Query construction, facet counts and inventory validation belong to the
 * search layer — this file only manipulates and serializes state, so the same
 * logic backs the mobile sheet, a desktop drawer and a deep link.
 */

export const EMPTY_FILTER_STATE: FilterState = { values: {} };

const isRange = (value: string[] | RangeValue): value is RangeValue =>
  typeof value === 'object' && !Array.isArray(value);

export const countAppliedFilters = (state: FilterState): number =>
  Object.values(state.values).reduce<number>((sum, value) => sum + (isRange(value) ? 1 : value.length), 0);

export const toggleFacetValue = (state: FilterState, facetId: string, optionId: string, multi = true): FilterState => {
  const current = state.values[facetId];
  const list = Array.isArray(current) ? current : [];

  const next = multi
    ? list.includes(optionId)
      ? list.filter((id) => id !== optionId)
      : [...list, optionId]
    : list.includes(optionId)
      ? []
      : [optionId];

  const values = { ...state.values };
  if (next.length === 0) delete values[facetId];
  else values[facetId] = next;

  return { ...state, values };
};

export const setRangeValue = (state: FilterState, facetId: string, range: RangeValue): FilterState => ({
  ...state,
  values: { ...state.values, [facetId]: range },
});

export const clearFacet = (state: FilterState, facetId: string): FilterState => {
  const values = { ...state.values };
  delete values[facetId];
  return { ...state, values };
};

export const clearAllFilters = (state: FilterState): FilterState => ({ values: {}, sort: state.sort });

export const validateRange = (facet: Facet, range: RangeValue): string | null => {
  if (range.min > range.max) return 'The minimum must be below the maximum';
  if (facet.min != null && range.min < facet.min) return `Minimum is ${facet.min}`;
  if (facet.max != null && range.max > facet.max) return `Maximum is ${facet.max}`;
  return null;
};

/** Shareable / restorable URL state. */
export const encodeFilterState = (state: FilterState): string => encodeURIComponent(JSON.stringify(state));

export const decodeFilterState = (encoded: string): FilterState => {
  try {
    const parsed = JSON.parse(decodeURIComponent(encoded)) as FilterState;
    return parsed.values ? parsed : EMPTY_FILTER_STATE;
  } catch {
    return EMPTY_FILTER_STATE;
  }
};

export interface AppliedChip {
  key: string;
  facetId: string;
  optionId?: string;
  label: string;
}

/** Applied-filter chips for the results screen, so filters stay visible. */
export const summarizeFilterState = (state: FilterState, facets: Facet[]): AppliedChip[] => {
  const chips: AppliedChip[] = [];

  for (const facet of facets) {
    const value = state.values[facet.id];
    if (!value) continue;

    if (isRange(value)) {
      chips.push({
        key: `${facet.id}`,
        facetId: facet.id,
        label: `${facet.label}: ${value.min}–${value.max}${facet.unitLabel ?? ''}`,
      });
      continue;
    }

    for (const optionId of value) {
      const option = facet.options?.find((candidate) => candidate.id === optionId);
      chips.push({
        key: `${facet.id}-${optionId}`,
        facetId: facet.id,
        optionId,
        label: option?.label ?? optionId,
      });
    }
  }

  return chips;
};
