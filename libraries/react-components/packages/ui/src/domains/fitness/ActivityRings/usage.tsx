import { ActivityRings } from './ActivityRings';
import sample from './sample.json';

export function ActivityRingsUsage() {
  // Read-only. Health data is authoritative — never optimistic, and never
  // interpreted as a diagnosis.
  return (
    <ActivityRings
      goals={sample.goals}
      syncedFrom={sample.syncedFrom}
      updatedAt={sample.updatedAt}
    />
  );
}
