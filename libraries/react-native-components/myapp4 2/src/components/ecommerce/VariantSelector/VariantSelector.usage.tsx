/**
 * USAGE — VariantSelector
 *
 * Demonstrates the constraint resolver: picking "Sand" makes sizes 7 and 12
 * unreachable. The previously-selected size is flagged rather than silently
 * changed — that is the whole point of the component.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Text } from 'react-native-paper';

import { AppButton } from '@ui/atoms/AppButton';
import { useSheet } from '@ui/providers/SheetProvider';
import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { VariantGroup } from '../types/domain';
import { VariantSelector, missingRequiredGroups, type VariantSelection } from './VariantSelector';
import sample from './VariantSelector.sample.json';

const data = loadSample<{ groups: VariantGroup[]; $constraints: Record<string, Record<string, boolean>> }>(sample);

export const VariantSelectorUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const sheet = useSheet();

  const [selection, setSelection] = useState<VariantSelection>({ color: 'slate' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  /** Constraint resolution stays outside the component. */
  const resolver = useCallback(
    (current: VariantSelection, group: VariantGroup) => {
      if (group.id !== 'size') return undefined;
      const colour = current.color;
      return colour ? data.$constraints[colour] : undefined;
    },
    [],
  );

  const handleChange = useCallback(
    (next: VariantSelection, changedGroupId: string) => {
      setSelection(next);
      setErrors({});

      // If the new colour invalidates the chosen size, say so — do not reassign.
      if (changedGroupId === 'color' && next.size) {
        const blocked = data.$constraints[next.color ?? '']?.[next.size] === false;
        if (blocked) {
          setErrors({ size: 'That size is not available in this colour. Pick another size.' });
          toast.warning('Your size is not available in this colour');
        }
      }
    },
    [toast],
  );

  const missing = useMemo(() => missingRequiredGroups(data.groups, selection), [selection]);

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.lg }}>
      <VariantSelector
        groups={data.groups}
        value={selection}
        onChange={handleChange}
        resolver={resolver}
        errors={errors}
        onHelpPress={(group) =>
          sheet.open(
            <Text variant="bodyMedium">
              Measure from heel to toe and match against the chart. If you are between sizes, size up.
            </Text>,
            { title: `${group.label} guide`, variant: 'bottom' },
          )
        }
        onNotifyMe={(_group, option) => toast.success(`We will tell you when ${option.label} is back`)}
        testID="variants"
      />

      <AppButton
        variant="primary"
        fullWidth
        onPress={() => {
          if (missing.length > 0) {
            setErrors(Object.fromEntries(missing.map((group) => [group.id, `Choose a ${group.label.toLowerCase()}`])));
            toast.warning(`Select ${missing.map((g) => g.label.toLowerCase()).join(' and ')}`);
            return;
          }
          toast.success(`Added: ${Object.entries(selection).map(([k, v]) => `${k}=${v}`).join(', ')}`);
        }}
      >
        {missing.length > 0 ? 'Choose options' : 'Add to cart'}
      </AppButton>

      <View style={{ gap: theme.spacing.xs }}>
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
          Current selection (this is what gets persisted to the cart and the deep link):
        </Text>
        <Text variant="labelSmall" selectable>
          {JSON.stringify(selection)}
        </Text>
      </View>
    </ScrollView>
  );
};
