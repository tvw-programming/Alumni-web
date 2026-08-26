import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import { memo } from 'react';

import {
  describe,
  statusOf,
  useOptimisticValue,
  type DeviceId,
  type StatusMap,
} from '../../../foundation';

export type DeviceConnection = 'online' | 'offline' | 'connecting' | 'error';

export interface DeviceCapability {
  id: string;
  label: string;
}

export interface DeviceState {
  id: DeviceId;
  name: string;
  room?: string;
  type: string;
  connection: DeviceConnection;
  power?: boolean;
  capabilities: DeviceCapability[];
  /** e.g. "22°C · heating" — whatever the device is currently doing. */
  statusLine?: string;
}

export interface DeviceCardProps {
  device: DeviceState;
  onPress: () => void;
  /** Resolves when the *device* acknowledges, not when the request is accepted. */
  onToggle?: (next: boolean) => Promise<void>;
}

const CONNECTION: StatusMap<DeviceConnection> = {
  online: { label: 'Online', color: 'success' },
  offline: { label: 'No response', color: 'default' },
  connecting: { label: 'Connecting', color: 'info' },
  error: { label: 'Error', color: 'error' },
};

/**
 * A device tile.
 *
 * The optimistic rule has a hard edge here: the switch may move immediately,
 * because the user pressed it — but **the promise must resolve on the device's
 * acknowledgement, not on the hub accepting the request**. A bulb that is
 * unplugged will accept a command and never turn on, and a UI that treats
 * "command sent" as "light is on" is lying about the physical world.
 *
 * An offline device is shown with its control disabled and the reason stated,
 * rather than a switch that silently does nothing.
 */
export const DeviceCard = memo(function DeviceCard({ device, onPress, onToggle }: DeviceCardProps) {
  const [power, toggle, pending] = useOptimisticValue(device.power ?? false, async (next) => {
    await onToggle?.(next);
  });

  const connection = statusOf(CONNECTION, device.connection);
  const reachable = device.connection === 'online';

  return (
    <Card variant="outlined" sx={{ opacity: reachable ? 1 : 0.7 }}>
      <CardActionArea
        onClick={onPress}
        aria-label={describe(
          device.name,
          device.room,
          device.power === undefined ? undefined : power ? 'on' : 'off',
          connection.label,
          device.statusLine,
        )}
      >
        <CardContent sx={{ pb: 1 }}>
          <Typography variant="subtitle2" fontWeight={700} noWrap aria-hidden>
            {device.name}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" aria-hidden>
            {[device.room, device.type].filter(Boolean).join(' · ')}
          </Typography>
          {device.statusLine ? (
            <Typography variant="caption" color="text.secondary" display="block" aria-hidden>
              {device.statusLine}
            </Typography>
          ) : null}
        </CardContent>
      </CardActionArea>

      <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 2, pb: 1.5 }}>
        <Chip size="small" variant="outlined" color={connection.color} label={connection.label} />

        {device.power !== undefined && onToggle ? (
          <Switch
            checked={power}
            // Disabled rather than silently ineffective. A switch that moves and
            // changes nothing is worse than one that explains itself.
            disabled={!reachable || pending}
            onChange={(event) => {
              toggle(event.target.checked);
            }}
            inputProps={{
              'aria-label': reachable
                ? `Turn ${device.name} ${power ? 'off' : 'on'}`
                : `${device.name} is not responding; control unavailable`,
            }}
            sx={{ ml: 'auto' }}
          />
        ) : null}
      </Stack>
    </Card>
  );
});
