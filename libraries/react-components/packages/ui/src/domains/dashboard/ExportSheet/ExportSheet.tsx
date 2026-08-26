import DownloadIcon from '@mui/icons-material/Download';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormLabel from '@mui/material/FormLabel';
import LinearProgress from '@mui/material/LinearProgress';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

import { useAction } from '../../../foundation';

export type ExportFormat = 'csv' | 'xlsx' | 'pdf';
export type ExportScope = 'view' | 'all';

export interface ExportRequest {
  format: ExportFormat;
  scope: ExportScope;
  includeAttachments: boolean;
}

export type ExportState =
  | { status: 'idle' }
  | { status: 'generating'; jobId: string; progress?: number }
  | { status: 'ready'; downloadId: string }
  | { status: 'error'; message: string };

export interface ExportSheetProps {
  open: boolean;
  /** Rows in the current view, so "Current view" is not a guess. */
  viewCount: number;
  totalCount: number;
  state: ExportState;
  onClose: () => void;
  /** Must resolve with a durable job id from the export service. */
  onGenerate: (request: ExportRequest) => Promise<string>;
  onDownload?: (downloadId: string) => void;
}

/**
 * Choose format and scope *before* generating.
 *
 * The rule that shapes this component: **a file is not "ready" until the export
 * service says so.** Optimism is only permissible once the backend has returned
 * a durable job id — before that there is nothing to be optimistic about, and a
 * "Download" button that appears on click hands the user a 404.
 *
 * Both counts are shown against the scope choice, because "Export all" meaning
 * 128 rows or 1.2 million rows is the difference between a click and a
 * five-minute wait.
 */
export function ExportSheet({
  open,
  viewCount,
  totalCount,
  state,
  onClose,
  onGenerate,
  onDownload,
}: ExportSheetProps) {
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [scope, setScope] = useState<ExportScope>('view');
  const [includeAttachments, setIncludeAttachments] = useState(false);

  const [result, generate, pending] = useAction<void, string>(async () =>
    onGenerate({ format, scope, includeAttachments }),
  );

  const generating = pending || state.status === 'generating';
  const ready = state.status === 'ready';

  return (
    <Dialog open={open} onClose={generating ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Export</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5}>
          <Stack spacing={1}>
            <FormLabel id="format-label">Format</FormLabel>
            <RadioGroup
              aria-labelledby="format-label"
              value={format}
              onChange={(event) => {
                setFormat(event.target.value as ExportFormat);
              }}
            >
              <FormControlLabel value="csv" control={<Radio size="small" />} label="CSV" />
              <FormControlLabel
                value="xlsx"
                control={<Radio size="small" />}
                label="Excel (XLSX)"
              />
              <FormControlLabel value="pdf" control={<Radio size="small" />} label="PDF" />
            </RadioGroup>
          </Stack>

          <Stack spacing={1}>
            <FormLabel id="scope-label">Rows</FormLabel>
            <RadioGroup
              aria-labelledby="scope-label"
              value={scope}
              onChange={(event) => {
                setScope(event.target.value as ExportScope);
              }}
            >
              {/* The counts are the whole point: "all" meaning 128 rows or
                  1.2 million is a click versus a five-minute wait. */}
              <FormControlLabel
                value="view"
                control={<Radio size="small" />}
                label={`Current view (${String(viewCount)})`}
              />
              <FormControlLabel
                value="all"
                control={<Radio size="small" />}
                label={`All records (${String(totalCount)})`}
              />
            </RadioGroup>
          </Stack>

          <FormControlLabel
            control={
              <Checkbox
                checked={includeAttachments}
                onChange={(event) => {
                  setIncludeAttachments(event.target.checked);
                }}
              />
            }
            label="Include attachments"
          />

          {generating ? (
            <Box>
              <LinearProgress
                variant={
                  state.status === 'generating' && state.progress !== undefined
                    ? 'determinate'
                    : 'indeterminate'
                }
                value={state.status === 'generating' ? state.progress : undefined}
              />
              <Typography variant="caption" color="text.secondary" role="status">
                Export is being prepared. You can close this — we will keep working.
              </Typography>
            </Box>
          ) : null}

          {ready ? (
            <Alert severity="success" role="status">
              Download ready.
            </Alert>
          ) : null}

          {state.status === 'error' || result.status === 'error' ? (
            <Alert severity="error" role="alert">
              {state.status === 'error' ? state.message : 'The export could not be prepared.'}
            </Alert>
          ) : null}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        {ready && onDownload ? (
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={() => {
              onDownload(state.downloadId);
            }}
          >
            Download
          </Button>
        ) : (
          <Button
            variant="contained"
            disabled={generating}
            onClick={() => {
              generate();
            }}
          >
            {generating ? 'Preparing…' : 'Generate export'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
