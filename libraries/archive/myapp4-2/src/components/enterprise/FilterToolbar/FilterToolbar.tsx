import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Icon, Menu, Text, TextInput, TouchableRipple } from 'react-native-paper';

import { AppButton } from '@ui/atoms/AppButton';
import { AppSheet } from '@ui/organisms/AppSheet';
import { FilterChipGroup } from '@ui/molecules/FilterChipGroup';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useWorkspaceTheme } from '../theme/enterpriseTokens';
import type { FilterDefinition, FilterValues } from '../types/domain';

export interface FilterToolbarProps extends StyleEscapeHatches {
  definitions: FilterDefinition[];
  values: FilterValues;
  resultCount?: number;
  loadingOptions?: boolean;
  onChange: (values: FilterValues) => void;
  onClear?: () => void;
  onSaveView?: () => void;
}

const summarizeValue = (definition: FilterDefinition, value: FilterValues[string]): string | undefined => {
  if (value == null || value === '' || (Array.isArray(value) && value.length === 0)) return undefined;
  if (definition.type === 'boolean') return definition.label;
  if (definition.type === 'dateRange' && typeof value === 'object' && !Array.isArray(value)) {
    const { start, end } = value as { start?: string; end?: string };
    return start && end ? `${start} – ${end}` : start ? `From ${start}` : end ? `Until ${end}` : undefined;
  }
  if (Array.isArray(value)) {
    const labels = value.map((v) => definition.options?.find((o) => o.value === v)?.label ?? v);
    return labels.length > 2 ? `${labels.slice(0, 2).join(', ')} +${labels.length - 2}` : labels.join(', ');
  }
  return definition.options?.find((o) => o.value === value)?.label ?? String(value);
};

/**
 * The toolbar exposes the current working set — every active filter renders
 * as a removable chip outside the menu, so a user never has to reopen a menu
 * to remember what's currently filtering their view.
 */
export const FilterToolbar = ({ definitions, values, resultCount, loadingOptions = false, onChange, onClear, onSaveView, style, containerStyle, testID }: FilterToolbarProps) => {
  const theme = useAppTheme();
  const enterprise = useWorkspaceTheme();
  const id = testID ?? 'filter-toolbar';
  const [openFilterId, setOpenFilterId] = useState<string | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);

  const activeChips = definitions
    .map((d) => ({ definition: d, summary: summarizeValue(d, values[d.id]) }))
    .filter((entry): entry is { definition: FilterDefinition; summary: string } => !!entry.summary);

  const removeFilter = (definitionId: string) => {
    const next = { ...values };
    delete next[definitionId];
    onChange(next);
  };

  const openFilter = definitions.find((d) => d.id === openFilterId);

  return (
    <View style={[containerStyle, style]} testID={id}>
      <View style={styles.headerRow}>
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={
            <TouchableRipple onPress={() => setMenuVisible(true)} accessibilityRole="button" accessibilityLabel={`Filter${activeChips.length ? `, ${activeChips.length} active` : ''}`} testID={childTestID(id, 'trigger')}>
              <View style={styles.row}>
                <Icon source="filter-variant" size={16} color={theme.colors.onSurface} />
                <Text variant="labelMedium" style={{ marginLeft: 4 }}>
                  Filter{activeChips.length > 0 ? ` (${activeChips.length})` : ''}
                </Text>
              </View>
            </TouchableRipple>
          }
        >
          {loadingOptions ? (
            <Menu.Item title="Loading filters…" disabled />
          ) : (
            definitions.map((definition) => (
              <Menu.Item
                key={definition.id}
                onPress={() => {
                  setMenuVisible(false);
                  setOpenFilterId(definition.id);
                }}
                title={definition.label}
                testID={childTestID(id, `open-${definition.id}`)}
              />
            ))
          )}
        </Menu>

        {resultCount != null ? (
          <Text variant="labelSmall" style={{ color: enterprise.colors.onSurfaceVariant, marginLeft: 12 }} accessibilityLiveRegion="polite">
            {resultCount.toLocaleString()} result{resultCount === 1 ? '' : 's'}
          </Text>
        ) : null}

        <View style={styles.flex} />

        {onSaveView && activeChips.length > 0 ? (
          <TouchableRipple onPress={onSaveView} accessibilityRole="button" accessibilityLabel="Save as view" testID={childTestID(id, 'save-view')}>
            <Text variant="labelSmall" style={{ color: theme.colors.primary }}>
              Save as view
            </Text>
          </TouchableRipple>
        ) : null}
        {onClear && activeChips.length > 0 ? (
          <TouchableRipple onPress={onClear} accessibilityRole="button" accessibilityLabel="Clear all filters" style={{ marginLeft: 12 }} testID={childTestID(id, 'clear-all')}>
            <Text variant="labelSmall" style={{ color: theme.colors.error }}>
              Clear all
            </Text>
          </TouchableRipple>
        ) : null}
      </View>

      {activeChips.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 6 }}>
          {activeChips.map(({ definition, summary }) => (
            <TouchableRipple
              key={definition.id}
              onPress={() => removeFilter(definition.id)}
              accessibilityRole="button"
              accessibilityLabel={`${definition.label}: ${summary}. Tap to remove.`}
              style={[styles.chip, { backgroundColor: enterprise.colors.selected, borderRadius: theme.radii.pill }]}
              testID={childTestID(id, `chip-${definition.id}`)}
            >
              <View style={styles.row}>
                <Text variant="labelSmall" style={{ color: enterprise.colors.onSelected }}>
                  {summary}
                </Text>
                <Icon source="close" size={12} color={enterprise.colors.onSelected} />
              </View>
            </TouchableRipple>
          ))}
        </ScrollView>
      ) : null}

      <AppSheet visible={!!openFilter} onDismiss={() => setOpenFilterId(null)} variant="bottom" title={openFilter?.label} testID={childTestID(id, 'filter-sheet')}>
        {openFilter ? <FilterEditor definition={openFilter} value={values[openFilter.id]} onChange={(v) => onChange({ ...values, [openFilter.id]: v })} onDone={() => setOpenFilterId(null)} testID={childTestID(id, 'editor')} /> : null}
      </AppSheet>
    </View>
  );
};

const FilterEditor = ({ definition, value, onChange, onDone, testID }: { definition: FilterDefinition; value: FilterValues[string]; onChange: (v: FilterValues[string]) => void; onDone: () => void; testID?: string }) => {
  const theme = useAppTheme();
  const [start, setStart] = useState((value as { start?: string })?.start ?? '');
  const [end, setEnd] = useState((value as { end?: string })?.end ?? '');
  const [search, setSearch] = useState(typeof value === 'string' ? value : '');
  const invalidRange = definition.type === 'dateRange' && !!start && !!end && start > end;

  return (
    <View style={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
      {definition.type === 'multiSelect' || definition.type === 'singleSelect' ? (
        <FilterChipGroup
          items={(definition.options ?? []).map((o) => ({ key: o.value, label: o.label }))}
          selected={definition.type === 'singleSelect' ? (value ? [value as string] : []) : ((value as string[]) ?? [])}
          onChange={(selected) => onChange(definition.type === 'singleSelect' ? selected[0] : selected)}
          mode={definition.type === 'singleSelect' ? 'single' : 'multi'}
          scrollable={false}
          testID={testID}
        />
      ) : definition.type === 'boolean' ? (
        <TouchableRipple onPress={() => onChange(!value)} accessibilityRole="checkbox" accessibilityState={{ checked: !!value }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Icon source={value ? 'checkbox-marked' : 'checkbox-blank-outline'} size={20} color={theme.colors.primary} />
            <Text variant="bodyMedium" style={{ marginLeft: 8 }}>
              {definition.label}
            </Text>
          </View>
        </TouchableRipple>
      ) : definition.type === 'dateRange' ? (
        <View style={{ gap: theme.spacing.sm }}>
          <TextInput mode="outlined" label="Start date (YYYY-MM-DD)" value={start} onChangeText={setStart} />
          <TextInput mode="outlined" label="End date (YYYY-MM-DD)" value={end} onChangeText={setEnd} />
          {invalidRange ? (
            <Text variant="labelSmall" style={{ color: theme.colors.error }}>
              Start date must be before end date.
            </Text>
          ) : null}
        </View>
      ) : (
        <TextInput mode="outlined" label="Search" value={search} onChangeText={setSearch} />
      )}

      <AppButton
        variant="primary"
        size="lg"
        fullWidth
        disabled={invalidRange}
        onPress={() => {
          if (definition.type === 'dateRange') onChange({ start: start || undefined, end: end || undefined });
          else if (definition.type === 'search') onChange(search || undefined);
          onDone();
        }}
      >
        Apply filters
      </AppButton>
    </View>
  );
};

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, gap: 6 },
});
