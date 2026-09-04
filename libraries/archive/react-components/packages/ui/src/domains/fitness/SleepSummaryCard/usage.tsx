import sample from './sample.json';
import { SleepSummaryCard } from './SleepSummaryCard';

export function SleepSummaryCardUsage() {
  // Read-only, and deliberately uninterpreted: no score, no "poor night".
  return (
    <SleepSummaryCard
      bedtime={sample.bedtime}
      wakeTime={sample.wakeTime}
      totalMinutes={sample.totalMinutes}
      goalMinutes={sample.goalMinutes}
      stages={sample.stages}
      source={sample.source}
      updatedAt={sample.updatedAt}
    />
  );
}
