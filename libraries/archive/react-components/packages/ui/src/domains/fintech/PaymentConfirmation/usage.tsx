import Button from '@mui/material/Button';
import { useState } from 'react';

import { newRequestId, parseMoney } from '../../../foundation';

import { PaymentConfirmation, type PaymentPhase } from './PaymentConfirmation';
import sample from './sample.json';

export function PaymentConfirmationUsage() {
  const [open, setOpen] = useState(true);

  return (
    <>
      <Button
        variant="outlined"
        onClick={() => {
          setOpen(true);
        }}
      >
        Open payment confirmation
      </Button>

      <PaymentConfirmation
        open={open}
        amount={parseMoney(sample.amount)}
        recipient={sample.recipient}
        fundingSource={sample.fundingSource}
        riskNotice={sample.riskNotice}
        onCancel={() => {
          setOpen(false);
        }}
        // The phase is whatever the server says. Nothing here promotes
        // "submitted" to "completed".
        onConfirm={async (): Promise<PaymentPhase> => {
          const response = await fetch('/api/payments', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              // The single most important header on this screen: a retry after
              // a timeout must not move the money twice.
              'Idempotency-Key': newRequestId(),
            },
            body: JSON.stringify({ amount: sample.amount, to: sample.recipient }),
          });
          if (!response.ok) throw await response.json();
          const body = (await response.json()) as { phase: PaymentPhase };
          return body.phase;
        }}
      />
    </>
  );
}
