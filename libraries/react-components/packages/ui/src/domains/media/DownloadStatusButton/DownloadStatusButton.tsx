import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DownloadIcon from '@mui/icons-material/Download';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import { useAction } from '../../../foundation';

export type DownloadState =
  | 'notDownloaded'
  | 'queued'
  | 'downloading'
  | 'paused'
  | 'complete'
  | 'failed'
  | 'expired'
  | 'unavailable';

export interface DownloadStatusButtonProps {
  title: string;
  state: DownloadState;
  progressPercent?: number;
  sizeLabel?: string;
  expiresInLabel?: string;
  unavailableReason?: string;
  onStart: () => Promise<void>;
  onPause?: () => Promise<void>;
  onResume?: () => Promise<void>;
  onRemove?: () => Promise<void>;
}

const STATE_LABEL: Record<DownloadState, string> = {
  notDownloaded: 'Download',
  queued: 'Queued',
  downloading: 'Downloading',
  paused: 'Paused',
  complete: 'Downloaded',
  failed: 'Download failed',
  expired: 'Download expired',
  unavailable: 'Not available to download',
};

/**
 * The download control for one title.
 *
 * Eight states, because a download has eight. `expired` in particular is
 * specific to licensed media: a file the user still has on disk but may no
 * longer play. Collapsing it into "not downloaded" makes the app look like it
 * lost their file.
 *
 * The size is shown before starting. A download that silently consumes 3.4 GB
 * on a metered connection is a complaint, and often a refund.
 *
 * React 19 Actions start and stop the transfer; **the progress belongs to the
 * download manager**, which survives the app being backgrounded.
 */
export function DownloadStatusButton({
  title,
  state,
  progressPercent,
  sizeLabel,
  expiresInLabel,
  unavailableReason,
  onStart,
  onPause,
  onResume,
  onRemove,
}: DownloadStatusButtonProps) {
  const [result, run, pending] = useAction<'start' | 'pause' | 'resume' | 'remove', 'done'>(
    async (_previous, command) => {
      if (command === 'start') await onStart();
      if (command === 'pause') await onPause?.();
      if (command === 'resume') await onResume?.();
      if (command === 'remove') await onRemove?.();
      return 'done';
    },
  );

  const label = `${STATE_LABEL[state]}${sizeLabel ? `, ${sizeLabel}` : ''}`;

  const icon =
    state === 'complete' ? (
      <CheckCircleIcon color="success" />
    ) : state === 'failed' || state === 'expired' ? (
      <ErrorOutlineIcon color="error" />
    ) : state === 'paused' ? (
      <PlayArrowIcon />
    ) : state === 'downloading' || state === 'queued' ? (
      <PauseIcon />
    ) : (
      <DownloadIcon />
    );

  const command: 'start' | 'pause' | 'resume' | 'remove' =
    state === 'downloading' || state === 'queued'
      ? 'pause'
      : state === 'paused'
        ? 'resume'
        : state === 'complete'
          ? 'remove'
          : 'start';

  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <Tooltip title={unavailableReason ?? `${label}: ${title}`}>
        <span>
          <IconButton
            aria-label={`${
              command === 'pause'
                ? 'Pause download of'
                : command === 'resume'
                  ? 'Resume download of'
                  : command === 'remove'
                    ? 'Remove download of'
                    : 'Download'
            } ${title}${sizeLabel ? `, ${sizeLabel}` : ''}`}
            disabled={state === 'unavailable' || pending}
            onClick={() => {
              run(command);
            }}
          >
            {pending ? <CircularProgress size={20} /> : icon}
          </IconButton>
        </span>
      </Tooltip>

      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" display="block">
          {state === 'downloading' && progressPercent !== undefined
            ? `${STATE_LABEL[state]} ${String(progressPercent)}%`
            : STATE_LABEL[state]}
        </Typography>

        {/* Size before starting, expiry after finishing. */}
        {state === 'notDownloaded' && sizeLabel ? (
          <Typography variant="caption" color="text.secondary">
            {sizeLabel}
          </Typography>
        ) : null}
        {state === 'complete' && expiresInLabel ? (
          <Typography variant="caption" color="text.secondary">
            {expiresInLabel}
          </Typography>
        ) : null}
        {state === 'expired' ? (
          <Typography variant="caption" color="error.main">
            Renew to watch offline again
          </Typography>
        ) : null}
        {state === 'unavailable' && unavailableReason ? (
          <Typography variant="caption" color="text.secondary">
            {unavailableReason}
          </Typography>
        ) : null}
        {result.status === 'error' ? (
          <Typography variant="caption" color="error.main" role="alert">
            {result.message}
          </Typography>
        ) : null}
      </Box>

      {state === 'complete' && onRemove ? (
        <IconButton
          size="small"
          aria-label={`Remove download of ${title}`}
          onClick={() => {
            run('remove');
          }}
        >
          <DeleteOutlineIcon fontSize="small" />
        </IconButton>
      ) : null}
    </Stack>
  );
}
