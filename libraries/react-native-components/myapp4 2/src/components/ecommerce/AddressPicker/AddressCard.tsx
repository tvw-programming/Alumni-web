import React, { memo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Icon, RadioButton, Text, TouchableRipple } from 'react-native-paper';

import { AppCard } from '@ui/molecules/AppCard';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useShopTheme } from '../theme/ecommerceTokens';
import type { Address } from '../types/domain';

const LABEL_ICON: Record<string, string> = {
  home: 'home-outline',
  work: 'briefcase-outline',
  other: 'map-marker-outline',
};

export interface AddressCardProps extends StyleEscapeHatches {
  address: Address;
  variant?: 'selectable' | 'compact' | 'management';
  selected?: boolean;
  onSelect?: (address: Address) => void;
  onEdit?: (address: Address) => void;
  onDelete?: (address: Address) => void;
  /** Collapse long addresses to two lines with a reveal. */
  truncate?: boolean;
}

/**
 * A saved address.
 *
 * Truncation is deliberately conservative and always reversible: two addresses
 * on the same street differ in the part that gets cut, so an over-eager ellipsis
 * makes them indistinguishable — and picking the wrong one is expensive.
 */
export const AddressCard = memo(function AddressCard({
  address,
  variant = 'selectable',
  selected = false,
  onSelect,
  onEdit,
  onDelete,
  truncate = true,
  style,
  containerStyle,
  testID,
}: AddressCardProps) {
  const theme = useAppTheme();
  const shop = useShopTheme();
  const [expanded, setExpanded] = useState(!truncate);

  const id = testID ?? `address-${address.id}`;
  const undeliverable = address.serviceability === 'unavailable';
  const checking = address.serviceability === 'checking';

  const fullAddress = [...address.lines, address.city, address.region, address.postalCode]
    .filter(Boolean)
    .join(', ');
  const needsReveal = truncate && fullAddress.length > 70;

  return (
    <AppCard
      variant="outlined"
      padded={false}
      containerStyle={containerStyle}
      style={[
        selected ? { borderColor: shop.colors.swatchSelected, borderWidth: 2 } : undefined,
        undeliverable ? { opacity: 0.75 } : undefined,
        style,
      ]}
      testID={id}
    >
      <TouchableRipple
        onPress={onSelect && !undeliverable ? () => onSelect(address) : undefined}
        disabled={!onSelect || undeliverable}
        accessibilityRole={onSelect ? 'radio' : 'none'}
        accessibilityState={{ selected, disabled: undeliverable }}
        accessibilityLabel={`${address.label ?? 'Address'}, ${address.recipientName}, ${fullAddress}${
          undeliverable ? '. Not deliverable to this address.' : ''
        }`}
      >
        <View style={[styles.row, { padding: theme.spacing.md, gap: theme.spacing.sm }]}>
          {variant === 'selectable' && onSelect ? (
            <RadioButton
              value={address.id}
              status={selected ? 'checked' : 'unchecked'}
              onPress={() => onSelect(address)}
              disabled={undeliverable}
            />
          ) : (
            <Icon
              source={LABEL_ICON[address.label ?? 'other'] ?? 'map-marker-outline'}
              size={theme.sizing.icon.md}
              color={theme.colors.onSurfaceVariant}
            />
          )}

          <View style={styles.flex}>
            <View style={[styles.row, { gap: theme.spacing.xs }]}>
              <Text variant="titleSmall">{address.recipientName}</Text>
              {address.label ? (
                <View
                  style={{
                    backgroundColor: theme.colors.surfaceVariant,
                    borderRadius: theme.radii.sm,
                    paddingHorizontal: 6,
                  }}
                >
                  <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    {address.label.toUpperCase()}
                  </Text>
                </View>
              ) : null}
              {address.isDefault ? (
                <Text variant="labelSmall" style={{ color: shop.colors.savings }}>
                  Default
                </Text>
              ) : null}
            </View>

            <Text
              variant="bodySmall"
              numberOfLines={expanded ? undefined : 2}
              style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}
              testID={childTestID(id, 'lines')}
            >
              {fullAddress}
            </Text>

            {needsReveal ? (
              <Text
                variant="labelSmall"
                onPress={() => setExpanded((prev) => !prev)}
                accessibilityRole="button"
                accessibilityState={{ expanded }}
                style={{ color: theme.colors.primary, marginTop: 2 }}
                testID={childTestID(id, 'reveal')}
              >
                {expanded ? 'Show less' : 'Show full address'}
              </Text>
            ) : null}

            {address.phone ? (
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                {address.phone}
              </Text>
            ) : null}

            {address.instructions ? (
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }} numberOfLines={2}>
                Note: {address.instructions}
              </Text>
            ) : null}

            {/* Serviceability is checked before payment, and stated plainly. */}
            {checking ? (
              <View style={[styles.row, { gap: 4, marginTop: theme.spacing.xs }]}>
                <ActivityIndicator size={12} />
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Checking delivery to this address…
                </Text>
              </View>
            ) : undeliverable ? (
              <View style={[styles.row, { gap: 4, marginTop: theme.spacing.xs }]}>
                <Icon source="alert-circle-outline" size={14} color={shop.colors.priceDeal} />
                <Text variant="labelSmall" style={{ color: shop.colors.priceDeal, flex: 1 }}>
                  {address.serviceabilityNote ?? 'We cannot deliver to this address'}
                </Text>
              </View>
            ) : null}

            {(onEdit || onDelete) && variant !== 'compact' ? (
              <View style={[styles.row, { gap: theme.spacing.md, marginTop: theme.spacing.sm }]}>
                {onEdit ? (
                  <Text
                    variant="labelSmall"
                    onPress={() => onEdit(address)}
                    accessibilityRole="button"
                    accessibilityLabel={`Edit address for ${address.recipientName}`}
                    style={{ color: theme.colors.primary }}
                    testID={childTestID(id, 'edit')}
                  >
                    Edit
                  </Text>
                ) : null}
                {onDelete ? (
                  <Text
                    variant="labelSmall"
                    onPress={() => onDelete(address)}
                    accessibilityRole="button"
                    accessibilityLabel={`Delete address for ${address.recipientName}`}
                    style={{ color: shop.colors.priceDeal }}
                    testID={childTestID(id, 'delete')}
                  >
                    Delete
                  </Text>
                ) : null}
              </View>
            ) : null}
          </View>
        </View>
      </TouchableRipple>
    </AppCard>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  flex: { flex: 1 },
});
