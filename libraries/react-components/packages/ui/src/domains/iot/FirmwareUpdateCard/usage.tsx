import { FirmwareUpdateCard, type FirmwareUpdate } from './FirmwareUpdateCard';
import sample from './sample.json';

export function FirmwareUpdateCardUsage() {
  const update = sample.update as FirmwareUpdate;

  return (
    <FirmwareUpdateCard
      update={update}
      // Starts the job; the phase then arrives from the device, not from here.
      // Persist it so the user can leave and come back mid-update.
      onInstall={async () => {
        const response = await fetch('/api/devices/dev_hub/firmware', { method: 'POST' });
        if (!response.ok) throw await response.json();
      }}
    />
  );
}
