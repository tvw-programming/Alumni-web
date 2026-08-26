import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, Text, TouchableRipple } from 'react-native-paper';

import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';

import type { TicketBarcode } from '../types/domain';

export interface BarcodeViewProps {
  barcode?: TicketBarcode;
  confirmationCode: string;
  size: number;
  expired?: boolean;
  onCopyCode?: () => void;
  testID?: string;
}

/**
 * A decorative bar pattern standing in for a real QR/PDF417 renderer, always
 * paired with a human-readable confirmation code — a barcode is never the
 * only way in. If the barcode can't render (`expired`, or `!barcode`), the
 * manual code is still the primary, fully usable path.
 */
export const BarcodeView = ({ barcode, confirmationCode, size, expired = false, onCopyCode, testID }: BarcodeViewProps) => {
  const theme = useAppTheme();

  // Deterministic pseudo-random bar widths derived from the code, purely decorative.
  const bars = useMemo(() => {
    const seed = (barcode?.value ?? confirmationCode).split('').map((c) => c.charCodeAt(0));
    return Array.from({ length: 28 }, (_, i) => 2 + (seed[i % seed.length]! % 5));
  }, [barcode, confirmationCode]);

  const showGraphic = !!barcode && !expired;

  return (
    <View style={{ alignItems: 'center' }} testID={testID}>
      <View
        style={[
          styles.box,
          { width: size, height: size, backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant, borderRadius: theme.radii.sm },
        ]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {showGraphic ? (
          <View style={styles.barsRow}>
            {bars.map((w, i) => (
              <View key={i} style={{ width: w, height: size - 24, backgroundColor: theme.colors.onSurface, marginHorizontal: 1 }} />
            ))}
          </View>
        ) : (
          <View style={styles.fallback}>
            <Icon source={expired ? 'qrcode-remove' : 'qrcode-off'} size={28} color={theme.colors.onSurfaceVariant} />
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 4 }}>
              {expired ? 'Code expired' : 'Barcode unavailable'}
            </Text>
          </View>
        )}
      </View>

      <Text
        variant="titleMedium"
        style={[styles.code, { color: theme.colors.onSurface }]}
        accessibilityLabel={`Confirmation number ${confirmationCode.split('').join(' ')}`}
        testID={childTestID(testID, 'code')}
      >
        {confirmationCode}
      </Text>

      {onCopyCode ? (
        <TouchableRipple
          onPress={onCopyCode}
          accessibilityRole="button"
          accessibilityLabel="Copy confirmation number"
          testID={childTestID(testID, 'copy')}
        >
          <Text variant="labelSmall" style={{ color: theme.colors.primary }}>
            Copy code
          </Text>
        </TouchableRipple>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  barsRow: { flexDirection: 'row', alignItems: 'center' },
  fallback: { alignItems: 'center', padding: 8 },
  code: { marginTop: 8, letterSpacing: 2, fontVariant: ['tabular-nums'] },
});
