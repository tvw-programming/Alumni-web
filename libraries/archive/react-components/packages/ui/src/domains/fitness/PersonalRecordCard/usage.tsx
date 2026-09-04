import { PersonalRecordCard } from './PersonalRecordCard';
import sample from './sample.json';

export function PersonalRecordCardUsage() {
  // Pre-formatted values: a PR can be a weight, a pace or a rep count, and the
  // card has no business knowing about all three unit systems.
  return <PersonalRecordCard record={sample.record} />;
}
