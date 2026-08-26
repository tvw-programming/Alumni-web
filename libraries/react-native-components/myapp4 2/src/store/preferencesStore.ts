import { create } from 'zustand';

interface PreferencesState {
  recentSearches: string[];
  addRecentSearch: (term: string) => void;
  clearRecentSearches: () => void;
}

const MAX_RECENTS = 5;

export const usePreferencesStore = create<PreferencesState>((set) => ({
  recentSearches: ['headphones', 'watch'],
  addRecentSearch: (term) =>
    set((state) => {
      const trimmed = term.trim();
      if (trimmed.length < 2) return state;
      return {
        recentSearches: [trimmed, ...state.recentSearches.filter((t) => t !== trimmed)].slice(0, MAX_RECENTS),
      };
    }),
  clearRecentSearches: () => set({ recentSearches: [] }),
}));
