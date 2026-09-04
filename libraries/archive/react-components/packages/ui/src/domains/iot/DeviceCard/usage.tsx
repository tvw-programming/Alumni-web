import { DeviceCard, type DeviceState } from './DeviceCard';
import sample from './sample.json';

export function DeviceCardUsage() {
  const device = sample.device as unknown as DeviceState;

  return (
    <DeviceCard
      device={device}
      onPress={() => {
        /* open the device detail */
      }}
      // Resolves on the device's acknowledgement, not on the hub accepting the
      // request. An unplugged bulb accepts commands and never turns on.
      onToggle={async (next) => {
        const response = await fetch(`/api/devices/${device.id}/power`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ on: next, waitForAck: true }),
        });
        if (!response.ok) throw await response.json();
      }}
    />
  );
}
