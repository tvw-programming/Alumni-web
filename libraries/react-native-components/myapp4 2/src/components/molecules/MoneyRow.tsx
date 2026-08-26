import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, Text, TouchableRipple } from 'react-native-paper';

import { formatMoney, formatMoneyForA11y, type Money } from '@ui/primitives/money';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

export type MoneyRowEmphasis = 'default' | 'total' | 'savings' | 'muted' | 'estimated';

export interface MoneyRowProps extends StyleEscapeHatches {
  label: string;
  value?: Money;
  /** Rendered instead of an amount: "FREE", "Calculated at checkout". */
  placeholder?: string;
  emphasis?: MoneyRowEmphasis;
  locale?: string;
  /** Secondary line under the label — fee explanations, tax basis. */
  hint?: string;
  /** Opens an explanation. Fee disclosures must be reachable, not tiny text. */
  onExplain?: () => void;
  explainLabel?: string;
}

/**
 * One row primitive for every money summary in the product.
 *
 * Shared deliberately: cart subtotals, service fees, taxes, tips and totals all
 * have to align to the same grid and speak the same way to a screen reader. A
 * bespoke row per surface is exactly how that alignment rots.
 */
export const MoneyRow = memo(function MoneyRow({
  label,
  value,
  placeholder,
  emphasis = 'default',
  locale = 'en-IN',
  hint,
  onExplain,
  explainLabel,
  style,
  containerStyle,
  testID,
}: MoneyRowProps) {
  const theme = useAppTheme();

  const color =
    emphasis === 'savings'
      ? theme.colors.success
      : emphasis === 'muted' || emphasis === 'estimated'
        ? theme.colors.onSurfaceVariant
        : theme.colors.onSurface;

  const variant = emphasis === 'total' ? 'titleMedium' : 'bodyMedium';
  const display = value ? formatMoney(value, { locale }) : (placeholder ?? '—');

  return (
    <View
      style={[styles.row, { paddingVertical: 4 }, containerStyle, style]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${label}: ${
        value ? formatMoneyForA11y(value, locale) : (placeholder ?? 'not available')
      }${hint ? `. ${hint}` : ''}`}
      testID={testID}
    >
      <View style={styles.flex}>
        <View style={[styles.row, { gap: 4 }]}>
          <Text variant={variant} style={{ color }}>
            {label}
          </Text>
          {onExplain ? (
            <TouchableRipple
              onPress={onExplain}
              borderless
              style={styles.explain}
              accessibilityRole="button"
              accessibilityLabel={explainLabel ?? `What is ${label}?`}
              testID={childTestID(testID, 'explain')}
            >
              <Icon source="information-outline" size={13} color={theme.colors.onSurfaceVariant} />
            </TouchableRipple>
          ) : null}
        </View>
        {hint ? (
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {hint}
          </Text>
        ) : null}
      </View>

      <Text variant={variant} style={[styles.tabular, { color }]}>
        {emphasis === 'savings' && value ? `− ${display}` : display}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  explain: { padding: 3, borderRadius: 12 },
  flex: { flex: 1 },
  tabular: { fontVariant: ['tabular-nums'] },
});
