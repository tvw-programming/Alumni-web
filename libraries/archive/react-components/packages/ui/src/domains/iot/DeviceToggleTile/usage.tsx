import Stack from '@mui/material/Stack';

import { asId, type DeviceId } from '../../../foundation';

import { DeviceToggleTile } from './DeviceToggleTile';
import sample from './sample.json';

export function DeviceToggleTileUsage() {
  return (
    <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
      <DeviceToggleTile
        id={asId<DeviceId>(sample.id)}
        name={sample.name}
        room={sample.room}
        on={sample.on}
        detail={sample.detail}
        onToggle={async (next) => {
          const response = await fetch(`/api/devices/${sample.id}/power`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ on: next, waitForAck: true }),
          });
          if (!response.ok) throw await response.json();
        }}
      />
      <DeviceToggleTile
        id={asId<DeviceId>('dev_hall')}
        name="Hallway light"
        room="Hallway"
        on={false}
        reachable={false}
        onToggle={() => Promise.resolve()}
      />
    </Stack>
  );
}
