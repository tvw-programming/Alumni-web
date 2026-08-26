import Box from '@mui/material/Box';
import { useState } from 'react';

import { RideStatusBottomSheet, type TripPhase } from './RideStatusBottomSheet';
import sample from './sample.json';

export function RideStatusBottomSheetUsage() {
  const [open, setOpen] = useState(true);

  return (
    // The sheet is `position: fixed`; the box gives the demo something to sit in.
    <Box sx={{ position: 'relative', minHeight: 320 }}>
      <RideStatusBottomSheet
        open={open}
        phase={sample.phase as TripPhase}
        etaLabel={sample.etaLabel}
        otp={sample.otp}
        onSafety={() => {
          /* open the safety toolkit */
        }}
        onCancel={async () => {
          const response = await fetch('/api/trips/current/cancel', { method: 'POST' });
          if (!response.ok) throw await response.json();
          setOpen(false);
        }}
      />
    </Box>
  );
}
