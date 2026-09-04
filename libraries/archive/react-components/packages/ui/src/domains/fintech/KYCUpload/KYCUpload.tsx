import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useId, useRef } from 'react';

import { useAction } from '../../../foundation';

export type KycDocumentState = 'required' | 'uploading' | 'submitted' | 'verified' | 'rejected';

export interface KycDocument {
  id: string;
  label: string;
  /** What a good photo looks like. Rejections are mostly avoidable. */
  guidance: string;
  state: KycDocumentState;
  rejectionReason?: string;
  acceptedTypes?: string[];
  maxSizeBytes?: number;
}

export interface KYCUploadProps {
  document: KycDocument;
  onUpload: (file: File) => Promise<void>;
}

/**
 * One identity document.
 *
 * The `guidance` line does the real work: most KYC rejections are avoidable
 * photographs — a corner cut off, a glare, an expired card — and telling people
 * before they shoot is cheaper than a rejection round trip that takes days.
 *
 * A rejection always carries a reason. "Rejected" with no reason is the single
 * most frustrating state in onboarding.
 *
 * The file never enters component state; it goes straight to the Action.
 */
export function KYCUpload({ document: kycDocument, onUpload }: KYCUploadProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const [result, upload, pending] = useAction<File, 'uploaded'>(async (_previous, file) => {
    await onUpload(file);
    return 'uploaded';
  });

  const state: KycDocumentState = pending ? 'uploading' : kycDocument.state;
  const accept = kycDocument.acceptedTypes?.join(',') ?? 'image/jpeg,image/png,application/pdf';

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={1.5}>
        <Stack direction="row" spacing={1} alignItems="center">
          {state === 'verified' ? (
            <CheckCircleIcon color="success" fontSize="small" />
          ) : state === 'rejected' ? (
            <ErrorOutlineIcon color="error" fontSize="small" />
          ) : (
            <CloudUploadIcon color="action" fontSize="small" />
          )}
          <Typography variant="subtitle2" fontWeight={700}>
            {kycDocument.label}
          </Typography>
        </Stack>

        <Typography variant="caption" color="text.secondary">
          {kycDocument.guidance}
        </Typography>

        {state === 'rejected' && kycDocument.rejectionReason ? (
          <Alert severity="error">{kycDocument.rejectionReason}</Alert>
        ) : null}

        {state === 'submitted' ? (
          <Alert severity="info">Submitted. Verification usually takes a few hours.</Alert>
        ) : null}

        {state === 'verified' ? <Alert severity="success">Verified.</Alert> : null}

        {state === 'uploading' ? (
          <Box>
            <LinearProgress />
            <Typography variant="caption" color="text.secondary">
              Uploading…
            </Typography>
          </Box>
        ) : null}

        {result.status === 'error' ? (
          <Alert severity="error" role="alert">
            {result.message}
          </Alert>
        ) : null}

        {state !== 'verified' && state !== 'uploading' ? (
          <Box>
            <input
              id={inputId}
              ref={inputRef}
              type="file"
              accept={accept}
              // Not `hidden`: a hidden input is skipped by some screen readers,
              // and the visible button is what carries the label anyway.
              style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}
              onChange={(event) => {
                const file = event.target.files?.[0];
                // Straight to the Action — the file never sits in state.
                if (file) upload(file);
                event.target.value = '';
              }}
            />
            <Button
              variant="outlined"
              startIcon={<CloudUploadIcon />}
              onClick={() => {
                inputRef.current?.click();
              }}
            >
              {state === 'rejected' ? 'Upload a new photo' : 'Upload document'}
            </Button>
          </Box>
        ) : null}
      </Stack>
    </Paper>
  );
}
