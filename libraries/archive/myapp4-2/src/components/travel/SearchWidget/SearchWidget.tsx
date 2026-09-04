import React, { useCallback, useMemo, useState } from 'react';
import { AccessibilityInfo, ScrollView, StyleSheet, View } from 'react-native';
import { Icon, List, SegmentedButtons, Text, TextInput, TouchableRipple } from 'react-native-paper';

import { AppButton } from '@ui/atoms/AppButton';
import { AppSheet } from '@ui/organisms/AppSheet';
import { DateRangePicker, type DateRange } from '@ui/molecules/DateRangePicker';
import { useControllableState, useMotion, type AnimatableProps } from '@/hooks';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useTravelTheme } from '../theme/travelTokens';
import { GuestRoomSelector } from '../GuestRoomSelector/GuestRoomSelector';
import type {
  OccupancyRules,
  RecentSearch,
  SearchQuery,
  TravelLocation,
  TripMode,
  TripType,
} from '../types/domain';

type EditingField = 'origin' | 'destination' | 'dates' | 'travelers' | null;
type ValidationErrors = Partial<Record<'origin' | 'destination' | 'dates' | 'travelers', string>>;

const MODE_LABEL: Record<TripMode, string> = {
  flight: 'Flights',
  hotel: 'Stays',
  package: 'Packages',
  activity: 'Activities',
};

export interface SearchWidgetProps extends StyleEscapeHatches, Pick<AnimatableProps, 'animated'> {
  value?: SearchQuery;
  defaultValue?: SearchQuery;
  onChange?: (query: SearchQuery) => void;
  onSearch: (query: SearchQuery) => void;
  /** Shared location pool, filtered locally as the traveler types. */
  locationOptions: TravelLocation[];
  locationsLoading?: boolean;
  locationsError?: string;
  onRetryLocations?: () => void;
  recentSearches?: RecentSearch[];
  onSelectRecentSearch?: (search: RecentSearch) => void;
  occupancyRules?: OccupancyRules;
  submitting?: boolean;
  modeOptions?: TripMode[];
  /** Shown once, e.g. "Restored your last search" — component does not decide when this applies. */
  restoredNote?: string;
}

const emptyQuery = (mode: TripMode): SearchQuery => ({ mode, tripType: 'roundTrip', travelers: { adults: 1, children: 0 } });

/**
 * Modular search shell: destination/route → dates → travelers → submit.
 *
 * Query state and search execution are deliberately separate — this component
 * only ever emits a normalized `SearchQuery` via `onSearch`; validation beyond
 * "is this query even submittable" (inventory, provider rules, pricing) is the
 * search service's job. Each field opens its own full-screen sheet on mobile
 * so a small inline row is never asked to host a whole calendar or list.
 */
export const SearchWidget = ({
  value,
  defaultValue,
  onChange,
  onSearch,
  locationOptions,
  locationsLoading = false,
  locationsError,
  onRetryLocations,
  recentSearches = [],
  onSelectRecentSearch,
  occupancyRules,
  submitting = false,
  modeOptions = ['flight', 'hotel'],
  restoredNote,
  style,
  containerStyle,
  testID,
  animated = true,
}: SearchWidgetProps) => {
  const theme = useAppTheme();
  const travel = useTravelTheme();
  const { enabled: motionOn } = useMotion({ animated });
  const id = testID ?? 'search-widget';

  const [query, setQuery] = useControllableState<SearchQuery>({
    value,
    defaultValue: defaultValue ?? emptyQuery(modeOptions[0] ?? 'flight'),
    onChange,
  });
  const [editing, setEditing] = useState<EditingField>(null);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [locationQuery, setLocationQuery] = useState('');
  const [restoredVisible, setRestoredVisible] = useState(!!restoredNote);

  const isHotelLike = query.mode !== 'flight';

  const filteredLocations = useMemo(() => {
    const text = locationQuery.trim().toLowerCase();
    if (!text) return locationOptions;
    return locationOptions.filter(
      (loc) => loc.city.toLowerCase().includes(text) || loc.name.toLowerCase().includes(text) || loc.code?.toLowerCase().includes(text),
    );
  }, [locationOptions, locationQuery]);

  const closeEditor = () => {
    setEditing(null);
    setLocationQuery('');
  };

  const handleSwap = useCallback(() => {
    setQuery((prev) => ({ ...prev, origin: prev.destination, destination: prev.origin }));
    AccessibilityInfo.announceForAccessibility?.('Departure and arrival swapped.');
  }, [setQuery]);

  const selectLocation = (field: 'origin' | 'destination', location: TravelLocation) => {
    setQuery((prev) => ({ ...prev, [field]: location }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    closeEditor();
  };

  const dateRangeValue: DateRange = {
    start: query.departureDate ? new Date(query.departureDate) : null,
    end: query.returnDate ? new Date(query.returnDate) : null,
  };

  const applyDateRange = (range: DateRange) => {
    setQuery((prev) => ({
      ...prev,
      departureDate: range.start ? range.start.toISOString().slice(0, 10) : undefined,
      returnDate: range.end ? range.end.toISOString().slice(0, 10) : undefined,
    }));
    setErrors((prev) => ({ ...prev, dates: undefined }));
  };

  const applyRecentSearch = (search: RecentSearch) => {
    setQuery(search.query);
    onSelectRecentSearch?.(search);
    closeEditor();
  };

  const validate = (): boolean => {
    const next: ValidationErrors = {};
    if (query.mode === 'flight' && !query.origin) next.origin = 'Choose a departure location.';
    if (!query.destination) next.destination = 'Choose a destination.';
    if (!query.flexibleDates) {
      if (!query.departureDate) next.dates = 'Add dates.';
      else if (query.tripType === 'roundTrip' && query.returnDate && query.returnDate < query.departureDate) {
        next.dates = 'Return date must be after departure.';
      }
    }
    if (query.travelers.adults < 1) next.travelers = 'Select at least one traveler.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onSearch(query);
  };

  const travelerSummary = `${query.travelers.adults + query.travelers.children} traveler${query.travelers.adults + query.travelers.children === 1 ? '' : 's'}${query.rooms ? `, ${query.rooms} room${query.rooms === 1 ? '' : 's'}` : ''}`;

  const dateSummary = query.flexibleDates
    ? 'Flexible dates'
    : query.departureDate
      ? `${formatShortDate(query.departureDate)}${query.returnDate ? ` – ${formatShortDate(query.returnDate)}` : ''}`
      : 'Add dates';

  return (
    <View style={[containerStyle, style]} testID={id}>
      {restoredNote && restoredVisible ? (
        <View
          style={[styles.restoredBanner, { backgroundColor: travel.colors.surfaceSelected, borderRadius: theme.radii.sm, padding: theme.spacing.sm }]}
          accessibilityLiveRegion="polite"
        >
          <Icon source="history" size={15} color={travel.colors.onSurfaceSelected} />
          <Text variant="labelSmall" style={{ color: travel.colors.onSurfaceSelected, marginLeft: 6, flex: 1 }}>
            {restoredNote}
          </Text>
          <Text
            variant="labelSmall"
            onPress={() => setRestoredVisible(false)}
            accessibilityRole="button"
            accessibilityLabel="Dismiss"
            style={{ color: travel.colors.onSurfaceSelected }}
          >
            Dismiss
          </Text>
        </View>
      ) : null}

      {modeOptions.length > 1 ? (
        <SegmentedButtons
          value={query.mode}
          onValueChange={(v) => setQuery((prev) => ({ ...prev, mode: v as TripMode }))}
          buttons={modeOptions.map((m) => ({ value: m, label: MODE_LABEL[m] }))}
          style={{ marginBottom: theme.spacing.sm }}
        />
      ) : null}

      {query.mode === 'flight' ? (
        <SegmentedButtons
          value={query.tripType ?? 'roundTrip'}
          onValueChange={(v) => setQuery((prev) => ({ ...prev, tripType: v as TripType }))}
          buttons={[
            { value: 'oneWay', label: 'One-way' },
            { value: 'roundTrip', label: 'Round trip' },
            { value: 'multiCity', label: 'Multi-city' },
          ]}
          style={{ marginBottom: theme.spacing.sm }}
        />
      ) : null}

      <View style={[styles.shell, { borderColor: theme.colors.outlineVariant, borderRadius: theme.radii.md, backgroundColor: travel.colors.surfaceSearch }]}>
        {query.mode === 'flight' ? (
          <View>
            <FieldRow
              icon="airplane-takeoff"
              label="Where from?"
              value={query.origin ? `${query.origin.city}${query.origin.code ? ` (${query.origin.code})` : ''}` : undefined}
              error={errors.origin}
              onPress={() => setEditing('origin')}
              testID={childTestID(id, 'origin')}
            />
            <TouchableRipple
              onPress={handleSwap}
              disabled={!query.origin && !query.destination}
              accessibilityRole="button"
              accessibilityLabel="Swap departure and arrival"
              style={[styles.swapButton, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outlineVariant }]}
              testID={childTestID(id, 'swap')}
            >
              <Icon source="swap-vertical" size={18} color={theme.colors.primary} />
            </TouchableRipple>
            <Divider />
            <FieldRow
              icon="airplane-landing"
              label="Where to?"
              value={query.destination ? `${query.destination.city}${query.destination.code ? ` (${query.destination.code})` : ''}` : undefined}
              error={errors.destination}
              onPress={() => setEditing('destination')}
              testID={childTestID(id, 'destination')}
            />
          </View>
        ) : (
          <FieldRow
            icon="map-marker-outline"
            label="Where to?"
            value={query.destination ? `${query.destination.city}` : undefined}
            error={errors.destination}
            onPress={() => setEditing('destination')}
            testID={childTestID(id, 'destination')}
          />
        )}

        <Divider />

        <FieldRow
          icon="calendar-blank-outline"
          label={query.mode === 'flight' ? 'Departure · Return' : 'Check-in · Check-out'}
          value={dateSummary}
          error={errors.dates}
          onPress={() => setEditing('dates')}
          testID={childTestID(id, 'dates')}
        />

        <Divider />

        <FieldRow
          icon="account-multiple-outline"
          label="Travelers and rooms"
          value={travelerSummary}
          error={errors.travelers}
          onPress={() => setEditing('travelers')}
          testID={childTestID(id, 'travelers')}
        />
      </View>

      <AppButton
        variant="primary"
        size="lg"
        fullWidth
        loading={submitting}
        debounceMs={800}
        onPress={handleSubmit}
        containerStyle={{ marginTop: theme.spacing.md }}
        testID={childTestID(id, 'submit')}
      >
        {query.mode === 'flight' ? 'Search flights' : 'Search stays'}
      </AppButton>

      {/* --- Origin / destination editor --- */}
      <AppSheet
        visible={editing === 'origin' || editing === 'destination'}
        onDismiss={closeEditor}
        variant="fullscreen"
        title={editing === 'origin' ? 'Where from?' : 'Where to?'}
        scrollable={false}
        testID={childTestID(id, 'location-sheet')}
      >
        <View style={{ padding: theme.spacing.md, gap: theme.spacing.sm, flex: 1 }}>
          <TextInput
            mode="outlined"
            placeholder="City or airport"
            value={locationQuery}
            onChangeText={setLocationQuery}
            left={<TextInput.Icon icon="magnify" />}
            autoFocus
            accessibilityLabel="Search city or airport"
            testID={childTestID(id, 'location-search')}
          />
          {locationsError ? (
            <View style={[styles.notice, { backgroundColor: theme.colors.errorContainer, borderRadius: theme.radii.sm, padding: theme.spacing.sm }]}>
              <Text variant="labelSmall" style={{ color: theme.colors.onErrorContainer, flex: 1 }}>
                {locationsError}
              </Text>
              {onRetryLocations ? (
                <Text
                  variant="labelSmall"
                  onPress={onRetryLocations}
                  accessibilityRole="button"
                  style={{ color: theme.colors.onErrorContainer, textDecorationLine: 'underline' }}
                >
                  Retry
                </Text>
              ) : null}
            </View>
          ) : null}

          <ScrollView>
            {!locationQuery && recentSearches.length > 0 ? (
              <View style={{ marginBottom: theme.spacing.md }}>
                <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 4 }}>
                  Recent searches
                </Text>
                {recentSearches.map((search) => (
                  <List.Item
                    key={search.id}
                    title={search.summaryLabel}
                    left={() => <List.Icon icon="clock-outline" />}
                    onPress={() => applyRecentSearch(search)}
                    testID={childTestID(id, `recent-${search.id}`)}
                  />
                ))}
              </View>
            ) : null}

            {locationsLoading ? (
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, padding: theme.spacing.sm }}>
                Loading airports…
              </Text>
            ) : filteredLocations.length === 0 ? (
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, padding: theme.spacing.sm }}>
                No matches for "{locationQuery}"
              </Text>
            ) : (
              filteredLocations.map((location) => (
                <List.Item
                  key={location.id}
                  title={`${location.city}${location.code ? ` (${location.code})` : ''}`}
                  description={location.isNearby ? `Nearby · ${location.name}` : `${location.name}${location.country ? `, ${location.country}` : ''}`}
                  left={() => <List.Icon icon={location.isNearby ? 'map-marker-radius-outline' : 'map-marker-outline'} />}
                  onPress={() => selectLocation(editing === 'origin' ? 'origin' : 'destination', location)}
                  testID={childTestID(id, `location-${location.id}`)}
                />
              ))
            )}
          </ScrollView>
        </View>
      </AppSheet>

      {/* --- Dates editor --- */}
      <AppSheet
        visible={editing === 'dates'}
        onDismiss={closeEditor}
        variant="bottom"
        title={query.mode === 'flight' ? 'Select dates' : 'Select check-in and check-out'}
        scrollable
        footer={
          <View style={{ gap: theme.spacing.sm }}>
            <TouchableRipple
              onPress={() => setQuery((prev) => ({ ...prev, flexibleDates: !prev.flexibleDates }))}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: !!query.flexibleDates }}
              accessibilityLabel="Flexible dates"
            >
              <View style={styles.row}>
                <Icon source={query.flexibleDates ? 'checkbox-marked' : 'checkbox-blank-outline'} size={20} color={theme.colors.primary} />
                <Text variant="bodyMedium" style={{ marginLeft: 8 }}>
                  Flexible dates
                </Text>
              </View>
            </TouchableRipple>
            <AppButton variant="primary" size="lg" fullWidth onPress={closeEditor} testID={childTestID(id, 'dates-done')}>
              Done
            </AppButton>
          </View>
        }
        testID={childTestID(id, 'dates-sheet')}
      >
        <View style={{ padding: theme.spacing.md }}>
          <DateRangePicker
            value={dateRangeValue}
            onChange={applyDateRange}
            mode={query.mode === 'flight' && query.tripType === 'oneWay' ? 'single' : 'range'}
            minDate={new Date()}
            animated={motionOn}
            testID={childTestID(id, 'date-picker')}
          />
        </View>
      </AppSheet>

      {/* --- Travelers editor --- */}
      <AppSheet
        visible={editing === 'travelers'}
        onDismiss={closeEditor}
        variant="bottom"
        title="Travelers and rooms"
        scrollable
        footer={
          <AppButton variant="primary" size="lg" fullWidth onPress={closeEditor} testID={childTestID(id, 'travelers-done')}>
            Done
          </AppButton>
        }
        testID={childTestID(id, 'travelers-sheet')}
      >
        <View style={{ padding: theme.spacing.md }}>
          <GuestRoomSelector
            value={{ adults: query.travelers.adults, children: query.travelers.children, infants: query.travelers.infants, rooms: query.rooms ?? 1 }}
            onChange={(next) =>
              setQuery((prev) => ({
                ...prev,
                travelers: { adults: next.adults, children: next.children, infants: next.infants },
                rooms: isHotelLike ? next.rooms : prev.rooms,
              }))
            }
            rules={occupancyRules}
          />
        </View>
      </AppSheet>
    </View>
  );
};

const FieldRow = ({
  icon,
  label,
  value,
  error,
  onPress,
  testID,
}: {
  icon: string;
  label: string;
  value?: string;
  error?: string;
  onPress: () => void;
  testID?: string;
}) => {
  const theme = useAppTheme();
  return (
    <TouchableRipple onPress={onPress} accessibilityRole="button" accessibilityLabel={`${label}${value ? `, ${value}` : ', not set'}`} testID={testID}>
      <View style={[styles.fieldRow, { padding: theme.spacing.md }]}>
        <Icon source={icon} size={20} color={theme.colors.onSurfaceVariant} />
        <View style={[styles.flex, { marginLeft: theme.spacing.sm }]}>
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {label}
          </Text>
          <Text variant="bodyLarge" numberOfLines={1}>
            {value ?? '—'}
          </Text>
          {error ? (
            <Text variant="labelSmall" style={{ color: theme.colors.error, marginTop: 2 }}>
              {error}
            </Text>
          ) : null}
        </View>
        <Icon source="chevron-right" size={20} color={theme.colors.onSurfaceVariant} />
      </View>
    </TouchableRipple>
  );
};

const Divider = () => {
  const theme = useAppTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.outlineVariant }} />;
};

const formatShortDate = (iso: string) => {
  const date = new Date(iso);
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(date);
};

const styles = StyleSheet.create({
  shell: { borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  fieldRow: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  swapButton: {
    position: 'absolute',
    right: 16,
    top: 46,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  notice: { flexDirection: 'row', alignItems: 'center' },
  restoredBanner: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
});
