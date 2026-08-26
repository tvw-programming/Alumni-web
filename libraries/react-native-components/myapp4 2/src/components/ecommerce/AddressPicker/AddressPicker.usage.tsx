/**
 * USAGE — AddressCard + AddressPicker
 *
 * The important interaction is `onBeforeChange`: switching address can change
 * price, ETA and availability, so the consequence is explained before it happens.
 */
import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { Text } from 'react-native-paper';

import { useConfirm } from '@ui/providers/ConfirmProvider';
import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { Address } from '../types/domain';
import { AddressPicker, type AddressProviderAdapter } from './AddressPicker';
import sample from './AddressPicker.sample.json';

const { addresses: initial } = loadSample<{ addresses: Address[] }>(sample);

export const AddressPickerUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const confirm = useConfirm();

  const [addresses, setAddresses] = useState<Address[]>(initial);
  const [selectedId, setSelectedId] = useState('addr-1');

  /** No map provider is wired up — manual entry still works. */
  const adapter: AddressProviderAdapter = {
    useCurrentLocation: async () => {
      await new Promise((resolve) => setTimeout(resolve, 800));
      toast.show('Located: Koramangala, Bengaluru');
      return { city: 'Bengaluru', postalCode: '560095' };
    },
  };

  /** Explain the consequence BEFORE committing the change. */
  const handleBeforeChange = useCallback(
    async (next: Address) => {
      if (next.id === selectedId) return true;
      return confirm({
        title: 'Change delivery address?',
        message:
          'Delivery time, fees and item availability are recalculated for the new address. Some items in your cart may not be deliverable.',
        confirmLabel: 'Change address',
      });
    },
    [confirm, selectedId],
  );

  return (
    <View style={{ flex: 1 }}>
      <Text variant="labelSmall" style={{ padding: theme.spacing.md, color: theme.colors.onSurfaceVariant }}>
        Two of these addresses are on the same road in Koramangala — tap "Show full address" to tell them apart.
      </Text>

      <AddressPicker
        addresses={addresses}
        selectedId={selectedId}
        adapter={adapter}
        onSelect={(address) => {
          setSelectedId(address.id);
          toast.success(`Delivering to ${address.label ?? 'address'}`);
        }}
        onBeforeChange={handleBeforeChange}
        onAddNew={() => toast.show('Opening the new-address form')}
        onEdit={(address) => toast.show(`Editing ${address.recipientName}`)}
        onDelete={(address) => {
          setAddresses((prev) => prev.filter((item) => item.id !== address.id));
          toast.show('Address deleted');
        }}
        postcodeFirst
        onPostcodeSubmit={(postcode) => toast.show(`Checking delivery to ${postcode}`)}
        testID="address-picker"
      />
    </View>
  );
};
