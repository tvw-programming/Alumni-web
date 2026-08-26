import { useState } from 'react';

import { PinPad } from './PinPad';
import sample from './sample.json';

export function PinPadUsage() {
  // The PIN lives here and is cleared as soon as it has been used. It is never
  // logged, never put in a query key, never sent anywhere but the auth call.
  const [pin, setPin] = useState(sample.value);
  const [error, setError] = useState<string | undefined>(undefined);

  return (
    <PinPad
      length={sample.length}
      value={pin}
      prompt={sample.prompt}
      attemptsRemaining={sample.attemptsRemaining}
      shuffle={sample.shuffle}
      errorMessage={error}
      onChange={(next) => {
        setPin(next);
        setError(undefined);
      }}
      onComplete={(complete) => {
        void (async () => {
          try {
            const response = await fetch('/api/auth/pin', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ pin: complete }),
            });
            if (!response.ok) setError('That PIN was not correct.');
          } finally {
            // Cleared whatever happened — a correct PIN left in state is still
            // a PIN in memory.
            setPin('');
          }
        })();
      }}
    />
  );
}
