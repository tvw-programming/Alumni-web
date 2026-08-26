import sample from './sample.json';
import { WaterIntakeTracker } from './WaterIntakeTracker';

export function WaterIntakeTrackerUsage() {
  return (
    <WaterIntakeTracker
      currentMl={sample.currentMl}
      goalMl={sample.goalMl}
      presets={sample.presets}
      // Optimistic: it is the user's own log, trivially reversible, and tapping
      // "glass" four times should not feel like four round trips.
      onChange={async (nextMl) => {
        const response = await fetch('/api/health/water', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            millilitres: nextMl,
            date: new Date().toISOString().slice(0, 10),
          }),
        });
        if (!response.ok) throw await response.json();
      }}
    />
  );
}
