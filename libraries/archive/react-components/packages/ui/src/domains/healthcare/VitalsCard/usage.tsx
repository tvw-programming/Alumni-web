import sample from './sample.json';
import { VitalsCard, type Vital } from './VitalsCard';

export function VitalsCardUsage() {
  // Read-only. A manual entry is a separate Action, and this card only shows
  // the value once the server has it — never a predicted reading.
  const vital = sample.vital as Vital;
  return (
    <VitalsCard
      vital={vital}
      onPress={() => {
        /* open the history chart */
      }}
    />
  );
}
