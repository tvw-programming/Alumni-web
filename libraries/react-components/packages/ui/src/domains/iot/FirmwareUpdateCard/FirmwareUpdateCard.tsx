import SystemUpdateAltIcon from '@mui/icons-material/SystemUpdateAlt';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { useAction } from '../../../foundation';

export type FirmwarePhase =
  'upToDate' | 'available' | 'downloading' | 'installing' | 'restarting' | 'complete' | 'failed';

export interface FirmwareUpdate {
  deviceName: string;
  currentVersion: string;
  availableVersion?: string;
  releaseNotes?: string;
  phase: FirmwarePhase;
  /** 0–100 while downloading. Absent once installing. */
  progress?: number;
  failureReason?: string;
}

export interface FirmwareUpdateCardProps {
  update: FirmwareUpdate;
  onInstall: () => Promise<void>;
}

const PHASE_COPY: Record<FirmwarePhase, string> = {
  upToDate: 'Up to date',
  available: 'Update available',
  downloading: 'Downloading update',
  installing: 'Installing — keep the device powered on',
  restarting: 'Device restarting',
  complete: 'Update complete',
  failed: 'Update failed',
};

/**
 * Firmware for one device.
 *
 * **"Keep the device powered on"** is on screen during install, not in a help
 * article. A power cut mid-flash bricks hardware, and the moment the user needs
 * that sentence is the moment they are deciding whether to unplug it.
 *
 * Progress is determinate while downloading and indeterminate while installing,
 * because the device reports bytes but not flash progress — a fake progress bar
 * during install is a bar that sits at 90% for four minutes.
 */
export function FirmwareUpdateCard({ update, onInstall }: FirmwareUpdateCardProps) {
  const [result, install, pending] = useAction<void, 'started'>(async () => {
    await onInstall();
    return 'started';
  });

  const phase: FirmwarePhase =
    pending && update.phase === 'available' ? 'downloading' : update.phase;
  const busy = phase === 'downloading' || phase === 'installing' || phase === 'restarting';
  const dangerous = phase === 'installing' || phase === 'restarting';

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          <SystemUpdateAltIcon color={phase === 'failed' ? 'error' : 'action'} />
          <Stack sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="subtitle2" fontWeight={700}>
              {update.deviceName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {update.availableVersion
                ? `${update.currentVersion} → ${update.availableVersion}`
                : `Version ${update.currentVersion}`}
            </Typography>
          </Stack>
        </Stack>

        <Typography variant="body2" sx={{ mt: 1.5 }} role="status">
          {PHASE_COPY[phase]}
        </Typography>

        {busy ? (
          <LinearProgress
            // Determinate only while the device reports bytes. A fake bar during
            // install sits at 90% for four minutes.
            variant={
              phase === 'downloading' && update.progress !== undefined
                ? 'determinate'
                : 'indeterminate'
            }
            value={update.progress}
            sx={{ mt: 1 }}
          />
        ) : null}

        {dangerous ? (
          <Alert severity="warning" sx={{ mt: 1.5, py: 0 }}>
            Keep the device powered on. Interrupting an update can damage it.
          </Alert>
        ) : null}

        {phase === 'failed' ? (
          <Alert severity="error" sx={{ mt: 1.5, py: 0 }} role="alert">
            {update.failureReason ??
              'The update did not complete. The device is still on its previous version.'}
          </Alert>
        ) : null}

        {result.status === 'error' ? (
          <Alert severity="error" sx={{ mt: 1.5, py: 0 }} role="alert">
            {result.message}
          </Alert>
        ) : null}

        {update.releaseNotes && phase === 'available' ? (
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1.5 }}>
            {update.releaseNotes}
          </Typography>
        ) : null}

        {phase === 'available' || phase === 'failed' ? (
          <Stack direction="row" justifyContent="flex-end" sx={{ mt: 1.5 }}>
            <Button
              size="small"
              variant="contained"
              disabled={pending}
              onClick={() => {
                install();
              }}
            >
              {phase === 'failed' ? 'Try again' : 'Download and install'}
            </Button>
          </Stack>
        ) : null}
      </CardContent>
    </Card>
  );
}
