import {
  DevicePairingWizard,
  type DiscoveredDevice,
  type PairingPhase,
} from './DevicePairingWizard';
import sample from './sample.json';

export function DevicePairingWizardUsage() {
  return (
    <DevicePairingWizard
      phase={sample.phase as PairingPhase}
      discovered={sample.discovered as DiscoveredDevice[]}
      rooms={sample.rooms}
      // Each phase is its own Action, and the phase is persisted so the user
      // can background the app mid-pairing and come back to it.
      onStartScan={async () => {
        await fetch('/api/pairing/scan', { method: 'POST' });
      }}
      onSelectDevice={async (deviceId) => {
        await fetch(`/api/pairing/connect/${deviceId}`, { method: 'POST' });
      }}
      onAssignRoom={async (roomId) => {
        await fetch('/api/pairing/room', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomId }),
        });
      }}
      onManualSetup={() => {
        /* open the setup-code form */
      }}
    />
  );
}
