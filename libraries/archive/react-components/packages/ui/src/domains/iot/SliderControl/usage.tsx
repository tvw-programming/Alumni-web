import sample from './sample.json';
import { SliderControl } from './SliderControl';

export function SliderControlUsage() {
  return (
    <SliderControl
      label={sample.label}
      value={sample.value}
      min={sample.min}
      max={sample.max}
      unit={sample.unit}
      // Called on release, not on every drag frame. Sixty commands a second
      // floods a Zigbee device and the queue is why the light lags the slider.
      onCommit={async (value) => {
        await fetch('/api/devices/dev_bed_light/brightness', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ brightness: value }),
        });
      }}
    />
  );
}
