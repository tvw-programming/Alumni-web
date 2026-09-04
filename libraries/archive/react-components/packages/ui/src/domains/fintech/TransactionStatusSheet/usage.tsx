import Button from '@mui/material/Button';
import { useState } from 'react';

import { parseMoney } from '../../../foundation';

import sample from './sample.json';
import { TransactionStatusSheet } from './TransactionStatusSheet';

export function TransactionStatusSheetUsage() {
  const [open, setOpen] = useState(true);

  return (
    <>
      <Button
        variant="outlined"
        onClick={() => {
          setOpen(true);
        }}
      >
        Show receipt
      </Button>
      <TransactionStatusSheet
        open={open}
        outcome="pending"
        amount={parseMoney(sample.amount)}
        recipient={sample.recipient}
        reference={sample.reference}
        completedAt={sample.completedAt}
        onClose={() => {
          setOpen(false);
        }}
        onContactSupport={() => {
          // Support needs the reference; deep-link with it attached.
        }}
      />
    </>
  );
}
