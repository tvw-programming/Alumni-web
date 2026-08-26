import { useQueryClient } from '@tanstack/react-query';

import { AddressPicker, type PostalAddress } from './AddressPicker';
import sample from './sample.json';

export function AddressPickerUsage() {
  const queryClient = useQueryClient();
  const addresses = sample.addresses as PostalAddress[];

  return (
    <AddressPicker
      addresses={addresses}
      selectedId={sample.selectedId}
      onSelect={async (id) => {
        const response = await fetch('/api/checkout/address', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ addressId: id }),
        });
        if (!response.ok) throw await response.json();
        // Shipping cost and delivery date depend on the address, so the totals
        // are refetched rather than adjusted here.
        await queryClient.invalidateQueries({ queryKey: ['cart', 'totals'] });
      }}
      onAddNew={() => {
        // open the address form
      }}
    />
  );
}
