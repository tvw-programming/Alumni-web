import { useState } from 'react';

import { parseMoney } from '../../../foundation';

import { PaymentMethodSelector, type PaymentMethod } from './PaymentMethodSelector';
import sample from './sample.json';

export function PaymentMethodSelectorUsage() {
  const methods: PaymentMethod[] = sample.methods.map((method) => ({
    id: method.id,
    kind: method.kind as PaymentMethod['kind'],
    label: method.label,
    hint: method.hint,
    expiresOn: method.expiresOn,
    balance: method.balance ? parseMoney(method.balance) : undefined,
    unavailableReason: method.unavailableReason,
  }));

  const [selectedId, setSelectedId] = useState(sample.selectedId);
  return (
    <PaymentMethodSelector methods={methods} selectedId={selectedId} onSelect={setSelectedId} />
  );
}
