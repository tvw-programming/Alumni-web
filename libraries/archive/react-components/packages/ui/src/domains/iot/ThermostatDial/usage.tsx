import sample from './sample.json';
import { ThermostatDial, type ThermostatMode } from './ThermostatDial';

export function ThermostatDialUsage() {
  return (
    <ThermostatDial
      // Measured by the device.
      ambient={sample.ambient}
      // Requested by the user.
      target={sample.target}
      mode={sample.mode as ThermostatMode}
      unit={sample.unit as '°C'}
      min={sample.min}
      max={sample.max}
      step={sample.step}
      activity={sample.activity}
      onCommitTarget={async (target) => {
        await fetch('/api/devices/dev_thermostat/target', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ target }),
        });
      }}
      onModeChange={async (mode) => {
        await fetch('/api/devices/dev_thermostat/mode', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode }),
        });
      }}
    />
  );
}
