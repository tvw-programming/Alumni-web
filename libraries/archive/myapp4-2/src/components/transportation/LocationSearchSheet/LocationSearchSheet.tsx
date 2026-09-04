import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Icon, List, Text, TextInput, TouchableRipple } from 'react-native-paper';

import { AppButton } from '@ui/atoms/AppButton';
import { AppSheet } from '@ui/organisms/AppSheet';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useRideTheme } from '../theme/transportationTokens';
import type { LocationPoint, LocationSearchState, RideRequestMode } from '../types/domain';

type EditingField = 'pickup' | 'dropoff' | null;

const TYPE_ICON: Record<LocationPoint['type'], string> = {
  current: 'crosshairs-gps',
  recent: 'clock-outline',
  saved: 'bookmark-outline',
  searchResult: 'map-marker-outline',
  landmark: 'map-marker-radius-outline',
};

export interface LocationSearchSheetProps extends StyleEscapeHatches {
  visible: boolean;
  onDismiss: () => void;
  pickup?: LocationPoint;
  dropoff?: LocationPoint;
  /** Local pool searched by text as the rider types. */
  searchResults?: LocationPoint[];
  recentPlaces?: LocationPoint[];
  savedPlaces?: LocationPoint[];
  mode?: RideRequestMode;
  state?: LocationSearchState;
  onSearchTextChange?: (text: string, field: 'pickup' | 'dropoff') => void;
  onPickupChange: (location: LocationPoint) => void;
  onDropoffChange: (location: LocationPoint) => void;
  onSwap?: () => void;
  onUseCurrentLocation?: () => void;
  onChooseOnMap?: () => void;
  onConfirm: () => void;
  onRetry?: () => void;
}

/**
 * "Where to?" first, pickup confirmed second — the same order Uber, Grab and
 * Gojek converge on. Textual selection stays available even when the map
 * provider fails, and this component never emits an exact address into
 * anything but its own `onPickupChange` / `onDropoffChange` callbacks.
 */
export const LocationSearchSheet = ({
  visible,
  onDismiss,
  pickup,
  dropoff,
  searchResults = [],
  recentPlaces = [],
  savedPlaces = [],
  mode = 'ride',
  state = 'idle',
  onSearchTextChange,
  onPickupChange,
  onDropoffChange,
  onSwap,
  onUseCurrentLocation,
  onChooseOnMap,
  onConfirm,
  onRetry,
  style,
  containerStyle,
  testID,
}: LocationSearchSheetProps) => {
  const theme = useAppTheme();
  const ride = useRideTheme();
  const id = testID ?? 'location-search-sheet';
  const [editing, setEditing] = useState<EditingField>(dropoff ? null : 'dropoff');
  const [query, setQuery] = useState('');

  const filteredResults = useMemo(() => {
    if (!query.trim()) return [];
    return searchResults.filter((r) => r.label.toLowerCase().includes(query.toLowerCase()) || r.address.toLowerCase().includes(query.toLowerCase()));
  }, [searchResults, query]);

  const selectLocation = (field: 'pickup' | 'dropoff', location: LocationPoint) => {
    (field === 'pickup' ? onPickupChange : onDropoffChange)(location);
    setEditing(null);
    setQuery('');
  };

  const canConfirm = !!pickup && !!dropoff && state !== 'invalid' && state !== 'locationPermissionDenied';

  return (
    <AppSheet
      visible={visible}
      onDismiss={onDismiss}
      variant="bottom"
      title={mode === 'ride' ? 'Plan your ride' : mode === 'delivery' ? 'Plan delivery' : 'Send a package'}
      scrollable={false}
      style={style}
      containerStyle={containerStyle}
      testID={id}
      footer={
        <AppButton variant="primary" size="lg" fullWidth disabled={!canConfirm} onPress={onConfirm} testID={childTestID(id, 'confirm')}>
          Confirm pickup
        </AppButton>
      }
    >
      <View style={{ padding: theme.spacing.md, gap: theme.spacing.sm }}>
        <FieldRow
          icon="circle-outline"
          label="Pickup location"
          value={pickup ? pickup.label : undefined}
          onPress={() => setEditing('pickup')}
          testID={childTestID(id, 'pickup')}
        />
        {onSwap ? (
          <TouchableRipple onPress={onSwap} accessibilityRole="button" accessibilityLabel="Swap pickup and destination" style={{ alignSelf: 'flex-end' }} testID={childTestID(id, 'swap')}>
            <Icon source="swap-vertical" size={18} color={theme.colors.primary} />
          </TouchableRipple>
        ) : null}
        <FieldRow
          icon="map-marker"
          label="Where to?"
          value={dropoff ? dropoff.label : undefined}
          onPress={() => setEditing('dropoff')}
          testID={childTestID(id, 'dropoff')}
        />

        {pickup?.pickupInstructions ? (
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {pickup.pickupInstructions}
          </Text>
        ) : null}

        {state === 'locationPermissionDenied' ? (
          <Notice icon="map-marker-off-outline" text="Location access is off. Search for your pickup instead." tone="warn" />
        ) : null}
        {state === 'invalid' ? <Notice icon="alert-circle-outline" text="This pickup is outside our service area." tone="error" /> : null}
      </View>

      <AppSheet
        visible={editing !== null}
        onDismiss={() => setEditing(null)}
        variant="fullscreen"
        title={editing === 'pickup' ? 'Pickup location' : 'Where to?'}
        scrollable={false}
        testID={childTestID(id, 'editor')}
      >
        <View style={{ padding: theme.spacing.md, gap: theme.spacing.sm, flex: 1 }}>
          <TextInput
            mode="outlined"
            placeholder={editing === 'pickup' ? 'Search pickup location' : 'Search destination'}
            value={query}
            onChangeText={(text) => {
              setQuery(text);
              if (editing) onSearchTextChange?.(text, editing);
            }}
            left={<TextInput.Icon icon="magnify" />}
            autoFocus
            accessibilityLabel={editing === 'pickup' ? 'Search pickup location' : 'Search destination'}
            testID={childTestID(id, 'search-input')}
          />

          {editing === 'pickup' && onUseCurrentLocation ? (
            <List.Item title="Use current location" left={() => <List.Icon icon="crosshairs-gps" />} onPress={onUseCurrentLocation} testID={childTestID(id, 'use-current')} />
          ) : null}
          {onChooseOnMap ? (
            <List.Item title="Choose on map" description="Move the pin to your exact pickup point" left={() => <List.Icon icon="map-marker-radius-outline" />} onPress={onChooseOnMap} testID={childTestID(id, 'choose-map')} />
          ) : null}

          {state === 'error' ? <Notice icon="cloud-off-outline" text="We couldn't reach the location service." tone="error" action={onRetry ? { label: 'Retry', onPress: onRetry } : undefined} /> : null}

          <ScrollView>
            {!query && recentPlaces.length > 0 ? (
              <Section title="Recent places">
                {recentPlaces.map((place) => (
                  <List.Item key={place.id} title={place.label} description={place.address} left={() => <List.Icon icon={TYPE_ICON[place.type]} />} onPress={() => selectLocation(editing!, place)} testID={childTestID(id, `recent-${place.id}`)} />
                ))}
              </Section>
            ) : null}

            {!query && savedPlaces.length > 0 ? (
              <Section title="Saved places">
                {savedPlaces.map((place) => (
                  <List.Item key={place.id} title={place.label} description={place.address} left={() => <List.Icon icon="bookmark-outline" />} onPress={() => selectLocation(editing!, place)} testID={childTestID(id, `saved-${place.id}`)} />
                ))}
              </Section>
            ) : null}

            {query && state === 'searching' ? (
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, padding: theme.spacing.sm }}>
                Searching…
              </Text>
            ) : query && filteredResults.length === 0 ? (
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, padding: theme.spacing.sm }}>
                No matches for "{query}"
              </Text>
            ) : (
              filteredResults.map((result) => (
                <List.Item
                  key={result.id ?? result.address}
                  title={result.label}
                  description={result.address}
                  left={() => <List.Icon icon={TYPE_ICON[result.type]} />}
                  onPress={() => selectLocation(editing!, result)}
                  testID={childTestID(id, `result-${result.id}`)}
                />
              ))
            )}
          </ScrollView>
        </View>
      </AppSheet>
    </AppSheet>
  );
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => {
  const theme = useAppTheme();
  return (
    <View style={{ marginBottom: theme.spacing.md }}>
      <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 4, paddingHorizontal: 4 }}>
        {title}
      </Text>
      {children}
    </View>
  );
};

const FieldRow = ({ icon, label, value, onPress, testID }: { icon: string; label: string; value?: string; onPress: () => void; testID?: string }) => {
  const theme = useAppTheme();
  return (
    <TouchableRipple onPress={onPress} accessibilityRole="button" accessibilityLabel={`${label}${value ? `, ${value}` : ', not set'}`} testID={testID}>
      <View style={[styles.row, { padding: theme.spacing.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.outlineVariant, borderRadius: theme.radii.md }]}>
        <Icon source={icon} size={18} color={theme.colors.onSurfaceVariant} />
        <View style={[styles.flex, { marginLeft: theme.spacing.sm }]}>
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {label}
          </Text>
          <Text variant="bodyLarge" numberOfLines={1}>
            {value ?? '—'}
          </Text>
        </View>
      </View>
    </TouchableRipple>
  );
};

const Notice = ({ icon, text, tone, action }: { icon: string; text: string; tone: 'warn' | 'error'; action?: { label: string; onPress: () => void } }) => {
  const theme = useAppTheme();
  const bg = tone === 'error' ? theme.colors.errorContainer : theme.colors.surfaceVariant;
  const fg = tone === 'error' ? theme.colors.onErrorContainer : theme.colors.onSurfaceVariant;
  return (
    <View style={[styles.row, { backgroundColor: bg, borderRadius: theme.radii.sm, padding: theme.spacing.sm }]} accessibilityLiveRegion="polite">
      <Icon source={icon} size={14} color={fg} />
      <Text variant="labelSmall" style={{ color: fg, marginLeft: 6, flex: 1 }}>
        {text}
      </Text>
      {action ? (
        <Text variant="labelSmall" onPress={action.onPress} accessibilityRole="button" style={{ color: fg, textDecorationLine: 'underline' }}>
          {action.label}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
});
