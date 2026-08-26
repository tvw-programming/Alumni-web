import Button from '@mui/material/Button';
import { useState } from 'react';

import { ExportSheet, type ExportState } from './ExportSheet';
import sample from './sample.json';

export function ExportSheetUsage() {
  const [open, setOpen] = useState(true);
  const [state, setState] = useState<ExportState>(sample.state as ExportState);

  return (
    <>
      <Button
        variant="outlined"
        onClick={() => {
          setOpen(true);
        }}
      >
        Export
      </Button>
      <ExportSheet
        open={open}
        viewCount={sample.viewCount}
        totalCount={sample.totalCount}
        state={state}
        onClose={() => {
          setOpen(false);
        }}
        // Returns a durable job id. Only then is there something to be
        // optimistic about — and the file is still not "ready" until the
        // service says so.
        onGenerate={async (request) => {
          const response = await fetch('/api/exports', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request),
          });
          if (!response.ok) throw await response.json();
          const body = (await response.json()) as { jobId: string };
          setState({ status: 'generating', jobId: body.jobId });
          return body.jobId;
        }}
        onDownload={(downloadId) => {
          window.location.href = `/api/exports/${downloadId}/file`;
        }}
      />
    </>
  );
}
