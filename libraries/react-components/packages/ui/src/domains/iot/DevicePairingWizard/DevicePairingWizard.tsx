import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import LinearProgress from '@mui/material/LinearProgress';
import ListItemButton from '@mui/material/ListItemButton';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Stepper from '@mui/material/Stepper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

import { useAction } from '../../../foundation';

export type PairingPhase = 'scan' | 'discovering' | 'connecting' | 'room' | 'added' | 'failed';

export interface DiscoveredDevice {
  id: string;
  name: string;
  signal?: 'strong' | 'weak';
}

export interface DevicePairingWizardProps {
  phase: PairingPhase;
  discovered: DiscoveredDevice[];
  rooms: { id: string; label: string }[];
  failureReason?: string;
  onStartScan: () => Promise<void>;
  onSelectDevice: (deviceId: string) => Promise<void>;
  onAssignRoom: (roomId: string) => Promise<void>;
  onManualSetup?: () => void;
}

const STEPS = ['Find device', 'Connect', 'Choose a room'];

/**
 * Adding a device.
 *
 * Every phase has wording that says what is happening and what the user should
 * do — "Finding device", "Connecting", "Couldn't find device". A spinner with
 * no text is the reason pairing flows get abandoned: the user cannot tell
 * whether to wait, move closer, or start again.
 *
 * **"Try manual setup" is always offered on failure.** Discovery fails for
 * ordinary reasons — a 5GHz network, a device already paired elsewhere — and a
 * dead end at that point means a returned product.
 */
export function DevicePairingWizard({
  phase,
  discovered,
  rooms,
  failureReason,
  onStartScan,
  onSelectDevice,
  onAssignRoom,
  onManualSetup,
}: DevicePairingWizardProps) {
  const [room, setRoom] = useState('');

  const [scanResult, scan, scanning] = useAction<void, 'scanned'>(async () => {
    await onStartScan();
    return 'scanned';
  });

  const activeStep =
    phase === 'scan' || phase === 'discovering' ? 0 : phase === 'connecting' ? 1 : 2;

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
        {STEPS.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {/* Every phase says what is happening. A bare spinner is why pairing
          flows get abandoned. */}
      <Typography variant="body2" role="status" sx={{ mb: 1.5 }}>
        {phase === 'scan'
          ? 'Put the device in pairing mode, then scan.'
          : phase === 'discovering'
            ? 'Finding device…'
            : phase === 'connecting'
              ? 'Connecting…'
              : phase === 'room'
                ? 'Choose a room for this device.'
                : phase === 'added'
                  ? 'Device added.'
                  : "Couldn't find device."}
      </Typography>

      {phase === 'discovering' || phase === 'connecting' ? (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <CircularProgress size={18} />
          <Typography variant="caption" color="text.secondary">
            {phase === 'discovering' ? 'Keep the device nearby.' : 'This can take up to a minute.'}
          </Typography>
        </Stack>
      ) : null}

      {phase === 'failed' ? (
        <Alert severity="warning" sx={{ mb: 2 }} role="alert">
          {failureReason ??
            'No devices responded. Move closer and make sure the device is in pairing mode.'}
        </Alert>
      ) : null}

      {scanResult.status === 'error' ? (
        <Alert severity="error" sx={{ mb: 2 }} role="alert">
          {scanResult.message}
        </Alert>
      ) : null}

      {discovered.length > 0 && (phase === 'discovering' || phase === 'scan') ? (
        <Stack spacing={0.5} sx={{ mb: 2 }}>
          {discovered.map((device) => (
            <ListItemButton
              key={device.id}
              onClick={() => {
                void onSelectDevice(device.id);
              }}
              sx={{ border: 1, borderColor: 'divider', borderRadius: 1 }}
            >
              <Stack sx={{ flexGrow: 1 }}>
                <Typography variant="body2">{device.name}</Typography>
                {device.signal ? (
                  <Typography
                    variant="caption"
                    color={device.signal === 'weak' ? 'warning.main' : 'text.secondary'}
                  >
                    {device.signal === 'weak' ? 'Weak signal — move closer' : 'Strong signal'}
                  </Typography>
                ) : null}
              </Stack>
            </ListItemButton>
          ))}
        </Stack>
      ) : null}

      {phase === 'room' ? (
        <Stack spacing={1.5} sx={{ mb: 2 }}>
          <TextField
            select
            size="small"
            label="Room"
            value={room}
            onChange={(event) => {
              setRoom(event.target.value);
            }}
          >
            {rooms.map((entry) => (
              <MenuItem key={entry.id} value={entry.id}>
                {entry.label}
              </MenuItem>
            ))}
          </TextField>
          <Button
            variant="contained"
            disabled={room === ''}
            onClick={() => {
              void onAssignRoom(room);
            }}
          >
            Finish
          </Button>
        </Stack>
      ) : null}

      {phase === 'added' ? (
        <LinearProgress variant="determinate" value={100} sx={{ mb: 2 }} />
      ) : null}

      <Stack direction="row" spacing={1} justifyContent="flex-end">
        {phase === 'failed' && onManualSetup ? (
          // Always offered. Discovery fails for ordinary reasons, and a dead
          // end here means a returned product.
          <Button onClick={onManualSetup}>Try manual setup</Button>
        ) : null}
        {phase === 'scan' || phase === 'failed' ? (
          <Button
            variant="contained"
            disabled={scanning}
            onClick={() => {
              scan();
            }}
          >
            {scanning ? 'Scanning…' : phase === 'failed' ? 'Scan again' : 'Scan'}
          </Button>
        ) : null}
      </Stack>
    </Paper>
  );
}
