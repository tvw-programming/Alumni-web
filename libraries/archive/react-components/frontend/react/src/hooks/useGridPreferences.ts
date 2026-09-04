import { useCallback, useEffect, useRef, useState, type SetStateAction } from 'react';

import {
  createEmptySortTiers,
  type ColumnPreference,
  type GridFilterState,
  type SortTier,
} from '@/components/grid/gridPreferences';
import { safeSessionStorage } from '@/utils/safeStorage';

/** Bump when the stored shape changes to invalidate stale sessions. */
const STORAGE_VERSION = 1;

/** Debounce delay in ms for localStorage writes. */
const DEBOUNCE_MS = 300;

interface StoredGridPreferences {
  version: number;
  preferences: ColumnPreference[];
  sortTiers: SortTier[];
  filterState: GridFilterState;
}

function load(storageKey: string): StoredGridPreferences | null {
  const raw = safeSessionStorage.get(storageKey);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredGridPreferences;
    return parsed.version === STORAGE_VERSION ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Reconcile stored column preferences with the current defaults: keep saved
 * settings for columns that still exist, append columns added since saving.
 */
function reconcile(stored: ColumnPreference[], defaults: ColumnPreference[]): ColumnPreference[] {
  const storedByColId = new Map(stored.map((pref) => [pref.colId, pref]));
  const known = defaults.map(
    (def) => storedByColId.get(def.colId) ?? { ...def, orderIndex: Number.MAX_SAFE_INTEGER },
  );
  return known
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((pref, index) => ({ ...pref, orderIndex: index }));
}

/**
 * Persists grid page preferences (column layout, sort tiers, filter state)
 * per `storageKey` so they survive navigation within the session.
 *
 * Writes are debounced by 300ms to avoid serializing on every keystroke
 * during rapid filter/sort operations.
 */
export function useGridPreferences(storageKey: string, defaultPreferences: ColumnPreference[]) {
  const [state, setState] = useState<StoredGridPreferences>(() => {
    const stored = load(storageKey);
    return {
      version: STORAGE_VERSION,
      preferences: stored ? reconcile(stored.preferences, defaultPreferences) : defaultPreferences,
      sortTiers: stored?.sortTiers ?? createEmptySortTiers(),
      filterState: stored?.filterState ?? {},
    };
  });

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced localStorage write — clear any pending timer on each state change.
  useEffect(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      safeSessionStorage.set(storageKey, JSON.stringify(state));
      timerRef.current = null;
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
    };
  }, [storageKey, state]);

  const setPreferences = useCallback((action: SetStateAction<ColumnPreference[]>) => {
    setState((prev) => ({
      ...prev,
      preferences: typeof action === 'function' ? action(prev.preferences) : action,
    }));
  }, []);

  const setSortTiers = useCallback((action: SetStateAction<SortTier[]>) => {
    setState((prev) => ({
      ...prev,
      sortTiers: typeof action === 'function' ? action(prev.sortTiers) : action,
    }));
  }, []);

  const setFilterState = useCallback((action: SetStateAction<GridFilterState>) => {
    setState((prev) => ({
      ...prev,
      filterState: typeof action === 'function' ? action(prev.filterState) : action,
    }));
  }, []);

  const reset = useCallback(() => {
    // Cancel any pending debounced write.
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    safeSessionStorage.remove(storageKey);
    setState({
      version: STORAGE_VERSION,
      preferences: defaultPreferences,
      sortTiers: createEmptySortTiers(),
      filterState: {},
    });
  }, [storageKey, defaultPreferences]);

  return {
    preferences: state.preferences,
    sortTiers: state.sortTiers,
    filterState: state.filterState,
    setPreferences,
    setSortTiers,
    setFilterState,
    reset,
  };
}
