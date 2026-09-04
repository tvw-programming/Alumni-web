import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { AppButton } from '@ui/atoms/AppButton';
import { AppTextInput } from '@ui/atoms/AppTextInput';
import { SkeletonList } from '@ui/atoms/Skeleton';
import { StateView } from '@ui/molecules/StateView';
import { useConfirm } from '@ui/providers/ConfirmProvider';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useShopTheme } from '../theme/ecommerceTokens';
import type { Address } from '../types/domain';
import { AddressCard } from './AddressCard';

/** Geocoding/autocomplete comes from an adapter, never a hard dependency. */
export interface AddressProviderAdapter {
  autocomplete?: (query: string) => Promise<Array<{ id: string; description: string }>>;
  useCurrentLocation?: () => Promise<Partial<Address>>;
  checkServiceability?: (address: Address) => Promise<Address['serviceability']>;
}

export interface AddressPickerProps extends StyleEscapeHatches {
  addresses: Address[];
  selectedId?: string;
  onSelect: (address: Address) => void;
  loading?: boolean;
  adapter?: AddressProviderAdapter;
  onAddNew?: () => void;
  onEdit?: (address: Address) => void;
  onDelete?: (address: Address) => void;
  /**
   * Called before committing a change that alters the cart. Return false to
   * cancel — changing address can change price, ETA and availability.
   */
  onBeforeChange?: (next: Address) => Promise<boolean>;
  postcodeFirst?: boolean;
  onPostcodeSubmit?: (postcode: string) => void;
}

/**
 * Saved-address selection.
 *
 * Two things it enforces: serviceability is surfaced before checkout rather
 * than at payment, and a change that would alter the cart is confirmed first —
 * silently re-pricing an order because the address moved is the kind of thing
 * users never forgive.
 */
export const AddressPicker = ({
  addresses,
  selectedId,
  onSelect,
  loading = false,
  adapter,
  onAddNew,
  onEdit,
  onDelete,
  onBeforeChange,
  postcodeFirst = false,
  onPostcodeSubmit,
  style,
  containerStyle,
  testID,
}: AddressPickerProps) => {
  const theme = useAppTheme();
  const shop = useShopTheme();
  const confirm = useConfirm();
  const [postcode, setPostcode] = useState('');
  const [locating, setLocating] = useState(false);

  const handleSelect = useCallback(
    async (address: Address) => {
      if (onBeforeChange) {
        const proceed = await onBeforeChange(address);
        if (!proceed) return;
      }
      onSelect(address);
    },
    [onBeforeChange, onSelect],
  );

  const handleDelete = useCallback(
    async (address: Address) => {
      const ok = await confirm({
        title: 'Delete this address?',
        message: `${address.recipientName}, ${address.lines.join(', ')}`,
        confirmLabel: 'Delete',
        destructive: true,
      });
      if (ok) onDelete?.(address);
    },
    [confirm, onDelete],
  );

  if (loading) {
    return (
      <View style={[{ padding: theme.spacing.md }, containerStyle]} testID={childTestID(testID, 'loading')}>
        <SkeletonList of="listItem" count={3} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={[{ padding: theme.spacing.md, gap: theme.spacing.md }, containerStyle, style]} testID={testID}>
      {postcodeFirst ? (
        <View style={{ gap: theme.spacing.sm }}>
          <Text variant="labelLarge">Check delivery to your area</Text>
          <View style={[styles.row, { gap: theme.spacing.sm }]}>
            <View style={styles.flex}>
              <AppTextInput
                label="Postcode"
                value={postcode}
                onChangeText={setPostcode}
                keyboardType="number-pad"
                maxLength={6}
                testID={childTestID(testID, 'postcode')}
              />
            </View>
            <AppButton
              variant="secondary"
              onPress={() => onPostcodeSubmit?.(postcode)}
              disabled={postcode.length < 4}
              testID={childTestID(testID, 'postcode-submit')}
            >
              Check
            </AppButton>
          </View>
        </View>
      ) : null}

      {adapter?.useCurrentLocation ? (
        <AppButton
          variant="ghost"
          icon="crosshairs-gps"
          loading={locating}
          onPress={async () => {
            setLocating(true);
            try {
              await adapter.useCurrentLocation?.();
            } finally {
              setLocating(false);
            }
          }}
          testID={childTestID(testID, 'locate')}
        >
          Use my current location
        </AppButton>
      ) : null}

      {addresses.length === 0 ? (
        <StateView
          preset="empty"
          title="No saved addresses"
          description="Add one to see delivery options and timings."
          primaryAction={onAddNew ? { label: 'Add an address', onPress: onAddNew } : undefined}
          testID={childTestID(testID, 'empty')}
        />
      ) : (
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel="Choose a delivery address"
          style={{ gap: theme.spacing.sm }}
        >
          {addresses.map((address) => (
            <AddressCard
              key={address.id}
              address={address}
              selected={address.id === selectedId}
              onSelect={(next) => void handleSelect(next)}
              onEdit={onEdit}
              onDelete={onDelete ? (next) => void handleDelete(next) : undefined}
            />
          ))}
        </View>
      )}

      {onAddNew && addresses.length > 0 ? (
        <AppButton variant="secondary" icon="plus" fullWidth onPress={onAddNew} testID={childTestID(testID, 'add')}>
          Add a new address
        </AppButton>
      ) : null}

      {/* Manual entry never depends on a map provider being available. */}
      {!adapter?.autocomplete ? (
        <Text variant="labelSmall" style={{ color: shop.colors.deliveryStandard }}>
          Address suggestions are unavailable right now — you can still enter an address manually.
        </Text>
      ) : null}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  flex: { flex: 1 },
});
