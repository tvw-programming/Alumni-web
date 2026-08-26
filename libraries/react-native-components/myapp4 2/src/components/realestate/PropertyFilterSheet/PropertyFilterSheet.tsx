import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Checkbox, Icon, RadioButton, Text, TextInput } from 'react-native-paper';

import { AppButton } from '@ui/atoms/AppButton';
import { AppSheet } from '@ui/organisms/AppSheet';
import { FilterChipGroup } from '@ui/molecules/FilterChipGroup';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { usePropertyTheme } from '../theme/realestateTokens';
import type { PropertyFilterState } from '../types/domain';

const BHK_OPTIONS = ['1 BHK', '2 BHK', '3 BHK', '4+ BHK'];
const PROPERTY_TYPE_OPTIONS = ['Apartment', 'Villa', 'Independent House', 'Plot', 'Commercial'];
const STATUS_OPTIONS = ['Ready to move', 'Under construction', 'New launch'];
const AMENITY_OPTIONS = ['Parking', 'Lift', 'Power backup', 'Gym', 'Swimming pool', 'Security'];
const FURNISHED_OPTIONS = ['Unfurnished', 'Semi-furnished', 'Fully furnished'];

export interface PropertyFilterSheetProps extends StyleEscapeHatches {
  visible: boolean;
  filters: PropertyFilterState;
  resultCount?: number;
  loadingCount?: boolean;
  optionsLoading?: boolean;
  onDismiss: () => void;
  onChange: (filters: PropertyFilterState) => void;
  onApply: () => void;
  onClearAll: () => void;
}

/**
 * Selection state is never colour-only — every chip, checkbox and radio
 * carries `accessibilityState.checked`, and the result count near Apply is
 * announced as it changes rather than silently updating.
 */
export const PropertyFilterSheet = ({ visible, filters, resultCount, loadingCount = false, optionsLoading = false, onDismiss, onChange, onApply, onClearAll, style, containerStyle, testID }: PropertyFilterSheetProps) => {
  const theme = useAppTheme();
  const realestate = usePropertyTheme();
  const id = testID ?? 'property-filter-sheet';
  const [minPriceText, setMinPriceText] = useState(filters.minPrice != null ? String(filters.minPrice) : '');
  const [maxPriceText, setMaxPriceText] = useState(filters.maxPrice != null ? String(filters.maxPrice) : '');

  const priceInvalid = !!minPriceText && !!maxPriceText && Number(minPriceText) > Number(maxPriceText);

  const update = (patch: Partial<PropertyFilterState>) => onChange({ ...filters, ...patch });

  const toggleInList = (key: 'propertyTypes' | 'statuses' | 'amenities' | 'furnished', value: string) => {
    const current = filters[key] ?? [];
    update({ [key]: current.includes(value) ? current.filter((v) => v !== value) : [...current, value] } as Partial<PropertyFilterState>);
  };

  return (
    <AppSheet
      visible={visible}
      onDismiss={onDismiss}
      variant="bottom"
      title="Filters"
      scrollable={false}
      style={style}
      containerStyle={containerStyle}
      testID={id}
      footer={
        <View style={{ gap: theme.spacing.sm }}>
          <View style={styles.row}>
            <AppButton variant="ghost" size="md" onPress={onClearAll} testID={childTestID(id, 'clear')}>
              Clear all
            </AppButton>
          </View>
          <AppButton variant="primary" size="lg" fullWidth onPress={onApply} testID={childTestID(id, 'apply')}>
            {loadingCount ? 'Applying…' : resultCount != null ? `Show ${resultCount.toLocaleString()} home${resultCount === 1 ? '' : 's'}` : 'Apply filters'}
          </AppButton>
        </View>
      }
    >
      <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.lg }}>
        <FilterSection title="Budget">
          <View style={styles.row}>
            <TextInput mode="outlined" label="Min price" keyboardType="number-pad" value={minPriceText} onChangeText={(t) => { setMinPriceText(t); update({ minPrice: t ? Number(t) : undefined }); }} style={styles.flex} testID={childTestID(id, 'min-price')} />
            <View style={{ width: theme.spacing.sm }} />
            <TextInput mode="outlined" label="Max price" keyboardType="number-pad" value={maxPriceText} onChangeText={(t) => { setMaxPriceText(t); update({ maxPrice: t ? Number(t) : undefined }); }} style={styles.flex} testID={childTestID(id, 'max-price')} />
          </View>
          {priceInvalid ? (
            <View style={styles.row}>
              <Icon source="alert-circle-outline" size={13} color={realestate.colors.error} />
              <Text variant="labelSmall" style={{ color: realestate.colors.error, marginLeft: 4 }}>
                Minimum price should be less than maximum price.
              </Text>
            </View>
          ) : null}
        </FilterSection>

        <FilterSection title="Configuration">
          <FilterChipGroup
            items={BHK_OPTIONS.map((b) => ({ key: b, label: b }))}
            selected={filters.bhk ?? []}
            onChange={(selected) => update({ bhk: selected })}
            mode="multi"
            scrollable={false}
            testID={childTestID(id, 'bhk')}
          />
        </FilterSection>

        <FilterSection title="Property type">
          {optionsLoading ? (
            <Text variant="bodySmall" style={{ color: realestate.colors.onSurfaceVariant }}>
              Loading property types…
            </Text>
          ) : (
            PROPERTY_TYPE_OPTIONS.map((type) => (
              <TouchableRow key={type} label={type} checked={!!filters.propertyTypes?.includes(type)} onToggle={() => toggleInList('propertyTypes', type)} testID={childTestID(id, `type-${type}`)} />
            ))
          )}
        </FilterSection>

        <FilterSection title="Area (sq ft)">
          <View style={styles.row}>
            <TextInput mode="outlined" label="Min area" keyboardType="number-pad" value={filters.minArea != null ? String(filters.minArea) : ''} onChangeText={(t) => update({ minArea: t ? Number(t) : undefined })} style={styles.flex} />
            <View style={{ width: theme.spacing.sm }} />
            <TextInput mode="outlined" label="Max area" keyboardType="number-pad" value={filters.maxArea != null ? String(filters.maxArea) : ''} onChangeText={(t) => update({ maxArea: t ? Number(t) : undefined })} style={styles.flex} />
          </View>
        </FilterSection>

        <FilterSection title="Furnishing">
          <FilterChipGroup items={FURNISHED_OPTIONS.map((f) => ({ key: f, label: f }))} selected={filters.furnished ?? []} onChange={(selected) => update({ furnished: selected })} mode="multi" scrollable={false} />
        </FilterSection>

        <FilterSection title="Availability">
          <FilterChipGroup items={STATUS_OPTIONS.map((s) => ({ key: s, label: s }))} selected={filters.statuses ?? []} onChange={(selected) => update({ statuses: selected })} mode="multi" scrollable={false} />
        </FilterSection>

        <FilterSection title="Amenities">
          <FilterChipGroup items={AMENITY_OPTIONS.map((a) => ({ key: a, label: a }))} selected={filters.amenities ?? []} onChange={(selected) => update({ amenities: selected })} mode="multi" scrollable={false} />
        </FilterSection>

        <FilterSection title="Verification">
          <View style={styles.row}>
            <Checkbox status={filters.verifiedOnly ? 'checked' : 'unchecked'} onPress={() => update({ verifiedOnly: !filters.verifiedOnly })} />
            <Text variant="bodyMedium">Verified listings only</Text>
          </View>
        </FilterSection>
      </ScrollView>
    </AppSheet>
  );
};

const FilterSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <View style={{ gap: 8 }}>
    <Text variant="titleSmall">{title}</Text>
    {children}
  </View>
);

const TouchableRow = ({ label, checked, onToggle, testID }: { label: string; checked: boolean; onToggle: () => void; testID?: string }) => (
  <View style={styles.row} testID={testID}>
    <RadioButton.Android status={checked ? 'checked' : 'unchecked'} onPress={onToggle} value={label} />
    <Text variant="bodyMedium" onPress={onToggle}>
      {label}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
});
