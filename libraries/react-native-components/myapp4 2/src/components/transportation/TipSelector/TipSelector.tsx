import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, Text, TextInput, TouchableRipple } from 'react-native-paper';

import { AppButton } from '@ui/atoms/AppButton';
import { formatMoney, type Money } from '@ui/primitives/money';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import type { TipOption } from '../types/domain';

export interface TipSelectorProps extends StyleEscapeHatches {
  options: TipOption[];
  selectedId?: string;
  currency: string;
  minCustom?: Money;
  maxCustom?: Money;
  locale?: string;
  submitting?: boolean;
  onSelect: (option: TipOption) => void;
  onCustomChange?: (amount: Money) => void;
  onSubmit?: () => void;
}

/**
 * "No tip" is rendered as an equally-weighted option, not a smaller or
 * greyed-out afterthought — declining a tip should never feel like the wrong
 * answer. Selection uses radio semantics, never colour alone.
 */
export const TipSelector = ({
  options,
  selectedId,
  currency,
  minCustom,
  maxCustom,
  locale = 'en-IN',
  submitting = false,
  onSelect,
  onCustomChange,
  onSubmit,
  style,
  containerStyle,
  testID,
}: TipSelectorProps) => {
  const theme = useAppTheme();
  const id = testID ?? 'tip-selector';
  const [customText, setCustomText] = useState('');
  const [customError, setCustomError] = useState<string | undefined>(undefined);

  const selected = options.find((o) => o.id === selectedId);
  const showCustomInput = selected?.type === 'custom';

  const handleCustomChange = (text: string) => {
    setCustomText(text);
    const numeric = Number(text.replace(/[^0-9.]/g, ''));
    if (!text) {
      setCustomError(undefined);
      return;
    }
    if (Number.isNaN(numeric)) {
      setCustomError('Enter a valid amount.');
      return;
    }
    const minorUnits = Math.round(numeric * 100);
    if (minCustom && minorUnits < minCustom.minorUnits) {
      setCustomError(`Minimum tip is ${formatMoney(minCustom, { locale })}.`);
      return;
    }
    if (maxCustom && minorUnits > maxCustom.minorUnits) {
      setCustomError(`Maximum tip is ${formatMoney(maxCustom, { locale })}.`);
      return;
    }
    setCustomError(undefined);
    onCustomChange?.({ minorUnits, currency });
  };

  return (
    <View style={[containerStyle, style]} testID={id}>
      <Text variant="titleSmall" style={{ marginBottom: theme.spacing.sm }}>
        Add a tip?
      </Text>
      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: theme.spacing.sm }}>
        100% goes to your driver.
      </Text>

      <View style={styles.grid} accessibilityRole="radiogroup">
        {options.map((option) => {
          const isSelected = option.id === selectedId;
          return (
            <TouchableRipple
              key={option.id}
              onPress={() => onSelect(option)}
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected }}
              accessibilityLabel={option.type === 'none' ? 'No tip' : option.label}
              style={[
                styles.chip,
                {
                  borderRadius: theme.radii.pill,
                  borderColor: isSelected ? theme.colors.primary : theme.colors.outlineVariant,
                  borderWidth: isSelected ? 2 : StyleSheet.hairlineWidth,
                  backgroundColor: isSelected ? theme.colors.primaryContainer : theme.colors.surface,
                },
              ]}
              testID={childTestID(id, option.id)}
            >
              <View style={styles.chipContent}>
                {isSelected ? (
                  <View style={{ marginRight: 4 }}>
                    <Icon source="check" size={13} color={theme.colors.onPrimaryContainer} />
                  </View>
                ) : null}
                <Text variant="labelMedium" style={{ color: isSelected ? theme.colors.onPrimaryContainer : theme.colors.onSurface }}>
                  {option.type === 'preset' && option.amount ? formatMoney(option.amount, { locale }) : option.label}
                </Text>
              </View>
            </TouchableRipple>
          );
        })}
      </View>

      {showCustomInput ? (
        <TextInput
          mode="outlined"
          label={`Custom amount (${currency})`}
          keyboardType="decimal-pad"
          value={customText}
          onChangeText={handleCustomChange}
          error={!!customError}
          style={{ marginTop: theme.spacing.sm }}
          testID={childTestID(id, 'custom-input')}
        />
      ) : null}
      {customError ? (
        <Text variant="labelSmall" style={{ color: theme.colors.error, marginTop: 4 }}>
          {customError}
        </Text>
      ) : null}

      {onSubmit ? (
        <AppButton
          variant="primary"
          size="lg"
          fullWidth
          disabled={!selected || (showCustomInput && (!!customError || !customText))}
          loading={submitting}
          onPress={onSubmit}
          containerStyle={{ marginTop: theme.spacing.md }}
          testID={childTestID(id, 'submit')}
        >
          {selected?.type === 'none' ? 'Continue without tipping' : 'Tip driver'}
        </AppButton>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { overflow: 'hidden' },
  chipContent: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 14 },
});
