import sample from './sample.json';
import { SearchWidget, type SearchCriteria } from './SearchWidget';

export function SearchWidgetUsage() {
  return (
    <SearchWidget
      places={sample.places}
      // The sample deliberately has a return date before departure, so the
      // field-level validation is visible on the first Search.
      initial={sample.initial as Partial<SearchCriteria>}
      recentSearches={sample.recentSearches}
      onSearch={async (criteria) => {
        const params = new URLSearchParams({
          from: criteria.from ?? '',
          to: criteria.to ?? '',
          depart: criteria.departOn,
          travellers: String(criteria.travellers),
          cabin: criteria.cabin,
        });
        // The criteria belong in the URL: a search result that cannot be shared
        // or reloaded is one people screenshot instead.
        const response = await fetch(`/api/flights/search?${params.toString()}`);
        if (!response.ok) throw await response.json();
      }}
    />
  );
}
