import FilterAltOutlinedIcon from '@mui/icons-material/FilterAltOutlined';
import ViewColumnOutlinedIcon from '@mui/icons-material/ViewColumnOutlined';
import { useMemo } from 'react';

import { DynamicFilterPanel } from '@/components/grid/DynamicFilterPanel';
import { PagePreferencesPanel } from '@/components/grid/PagePreferencesPanel';
import { PreferencesBar, type PreferenceSectionConfig } from '@/components/preferences';
import { snackbar } from '@/components/snackbar/snackbarBus';

import type {
  ColumnPreference,
  FilterFieldConfig,
  GridFilterState,
  SortTier,
} from '@/components/grid/gridPreferences';
import type { User } from '@/types/user';

/**
 * DummyJSON has no preferences resource; POST /users/add echoes the payload
 * back, standing in for a real "save my preferences" endpoint. Real apps point
 * each section at their own route (e.g. /me/preferences/users-grid).
 */
const SAVE_ENDPOINT = '/users/add';

/** Draft shape for the Page Preferences popup. */
export interface PagePreferencesDraft {
  preferences: ColumnPreference[];
  sortTiers: SortTier[];
}

/** Draft shape for the Filter Preferences popup. */
export interface FilterPreferencesDraft {
  filterState: GridFilterState;
}

export interface UsersPreferencesContainerProps {
  /** Committed state (owned by the page via useGridPreferences). */
  preferences: ColumnPreference[];
  /** Default preferences used to detect whether any change has been applied. */
  defaultPreferences: ColumnPreference[];
  sortTiers: SortTier[];
  filterState: GridFilterState;
  /** Committers — invoked by Apply, and by Save after the API confirms. */
  onPagePreferencesApply: (draft: PagePreferencesDraft) => void;
  onFilterPreferencesApply: (draft: FilterPreferencesDraft) => void;
  /** Filter panel inputs. */
  filterConfigs: FilterFieldConfig<User>[];
  rows: User[];
}

/**
 * Returns true when any sort tier has a non-empty column + direction.
 * Used to detect whether sort preferences are non-default.
 */
function hasActiveSortTiers(sortTiers: SortTier[]): boolean {
  return sortTiers.some((t) => t.colId !== '' && t.direction !== '');
}

/**
 * Returns true when any column preference differs from its default counterpart.
 * Compares widthMode, pinned, and lockOrder — orderIndex changes are also tracked.
 */
function hasNonDefaultColumnPrefs(
  preferences: ColumnPreference[],
  defaults: ColumnPreference[],
): boolean {
  const defaultMap = new Map(defaults.map((d) => [d.colId, d]));
  return preferences.some((pref) => {
    const def = defaultMap.get(pref.colId);
    if (!def) return true; // new column added
    return (
      pref.widthMode !== def.widthMode ||
      pref.pinned !== def.pinned ||
      pref.lockOrder !== def.lockOrder ||
      pref.orderIndex !== def.orderIndex
    );
  });
}

/**
 * Users-route preference sections, expressed as config for the shared
 * {@link PreferencesBar}. Both popups edit a local draft; Apply commits it to
 * grid state instantly, Save round-trips the API first.
 *
 * The `active` flag on each section config drives the red badge dot —
 * computed here so no extra props are needed anywhere above this component.
 *
 * Adding a new grid: create your own container following this pattern.
 */
export function UsersPreferencesContainer({
  preferences,
  defaultPreferences,
  sortTiers,
  filterState,
  onPagePreferencesApply,
  onFilterPreferencesApply,
  filterConfigs,
  rows,
}: UsersPreferencesContainerProps) {
  // ── Active-state detection ────────────────────────────────────────────────
  const isPageActive = useMemo(
    () =>
      hasNonDefaultColumnPrefs(preferences, defaultPreferences) || hasActiveSortTiers(sortTiers),
    [preferences, defaultPreferences, sortTiers],
  );

  const isFilterActive = useMemo(
    () => Object.keys(filterState).some((k) => filterState[k] !== undefined),
    [filterState],
  );

  // ── Section configs ───────────────────────────────────────────────────────
  const pageSection = useMemo<PreferenceSectionConfig<PagePreferencesDraft>>(
    () => ({
      id: 'users-page-preferences',
      title: 'Page preferences',
      description: 'Column layout, pinning and sort priority',
      icon: <ViewColumnOutlinedIcon fontSize="small" />,
      value: { preferences, sortTiers },
      // `active` drives the red badge dot — no extra prop needed in PreferencesBar.
      active: isPageActive,
      renderContent: (draft, onDraftChange) => (
        <PagePreferencesPanel
          preferences={draft.preferences}
          onPreferencesChange={(next) => onDraftChange({ ...draft, preferences: next })}
          sortTiers={draft.sortTiers}
          onSortTiersChange={(next) => onDraftChange({ ...draft, sortTiers: next })}
        />
      ),
      onApply: onPagePreferencesApply,
      saveEndpoint: SAVE_ENDPOINT,
      onSaveSuccess: () => snackbar.success('Page preferences saved'),
      bodyMaxHeight: 'none',
    }),
    [preferences, sortTiers, isPageActive, onPagePreferencesApply],
  );

  const filterSection = useMemo<PreferenceSectionConfig<FilterPreferencesDraft>>(
    () => ({
      id: 'users-filter-preferences',
      title: 'Filter preferences',
      description: 'Field filters applied to the grid rows',
      icon: <FilterAltOutlinedIcon fontSize="small" />,
      value: { filterState },
      // `active` drives the red badge dot — no extra prop needed in PreferencesBar.
      active: isFilterActive,
      renderContent: (draft, onDraftChange) => (
        <DynamicFilterPanel
          configs={filterConfigs}
          rows={rows}
          filterState={draft.filterState}
          onFilterStateChange={(next) => onDraftChange({ filterState: next })}
          columns={2}
        />
      ),
      onApply: onFilterPreferencesApply,
      saveEndpoint: SAVE_ENDPOINT,
      onSaveSuccess: () => snackbar.success('Filter preferences saved'),
      bodyMaxHeight: 'none',
    }),
    [filterState, filterConfigs, rows, isFilterActive, onFilterPreferencesApply],
  );

  return <PreferencesBar sections={[pageSection, filterSection]} />;
}
