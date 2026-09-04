import Button from '@mui/material/Button';
import { useState } from 'react';

import { ConsentDialog } from './ConsentDialog';
import sample from './sample.json';

export function ConsentDialogUsage() {
  const [open, setOpen] = useState(true);

  return (
    <>
      <Button
        variant="outlined"
        onClick={() => {
          setOpen(true);
        }}
      >
        Open consent
      </Button>
      <ConsentDialog
        open={open}
        title={sample.title}
        purpose={sample.purpose}
        version={sample.version}
        clauses={sample.clauses}
        onDecline={() => {
          setOpen(false);
        }}
        // The version goes to the server with the acceptance: "the patient
        // agreed" is meaningless without knowing what they agreed to.
        onAccept={async (accepted, version) => {
          const response = await fetch('/api/consents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accepted, version, acceptedAt: new Date().toISOString() }),
          });
          if (!response.ok) throw await response.json();
          setOpen(false);
        }}
      />
    </>
  );
}
