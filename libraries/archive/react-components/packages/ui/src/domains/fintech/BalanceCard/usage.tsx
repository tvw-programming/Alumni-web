import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { parseMoney } from '../../../foundation';

import { BalanceCard } from './BalanceCard';
import sample from './sample.json';

export function BalanceCardUsage() {
  // Visibility is local: it is a display preference, and persisting it server
  // side would mean a balance that unmasks itself on a colleague's screen.
  const [visible, setVisible] = useState(false);
  const queryClient = useQueryClient();

  return (
    <BalanceCard
      accountName={sample.accountName}
      balance={parseMoney(sample.balance)}
      availableBalance={parseMoney(sample.availableBalance)}
      visibility={visible ? 'visible' : 'masked'}
      status="ready"
      updatedAt={sample.updatedAt}
      onToggleVisibility={() => {
        setVisible((current) => !current);
      }}
      // The figure only changes when the server answers. Nothing here predicts
      // a balance.
      onRefresh={async () => {
        await queryClient.refetchQueries({ queryKey: ['accounts', 'balance'] });
      }}
    />
  );
}
