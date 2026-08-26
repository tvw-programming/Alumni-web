import Button from '@mui/material/Button';
import { useState } from 'react';

import { ReportBlockSheet } from './ReportBlockSheet';
import sample from './sample.json';

export function ReportBlockSheetUsage() {
  const [open, setOpen] = useState(true);

  return (
    <>
      <Button
        color="error"
        variant="outlined"
        onClick={() => {
          setOpen(true);
        }}
      >
        Report post
      </Button>
      <ReportBlockSheet
        open={open}
        subjectLabel={sample.subjectLabel}
        reasons={sample.reasons}
        onClose={() => {
          setOpen(false);
        }}
        onSubmit={async (input) => {
          const response = await fetch('/api/reports', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...input, subject: sample.subjectLabel }),
          });
          if (!response.ok) throw await response.json();
        }}
      />
    </>
  );
}
