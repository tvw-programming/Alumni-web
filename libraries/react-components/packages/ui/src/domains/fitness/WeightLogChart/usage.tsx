import sample from './sample.json';
import { WeightLogChart } from './WeightLogChart';

export function WeightLogChartUsage() {
  return (
    <WeightLogChart
      entries={sample.entries}
      unit={sample.unit as 'kg'}
      goalWeight={sample.goalWeight}
    />
  );
}
