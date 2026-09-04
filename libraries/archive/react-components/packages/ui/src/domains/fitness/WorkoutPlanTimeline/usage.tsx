import sample from './sample.json';
import { WorkoutPlanTimeline, type PlanDay } from './WorkoutPlanTimeline';

export function WorkoutPlanTimelineUsage() {
  return (
    <WorkoutPlanTimeline
      planName={sample.planName}
      weekLabel={sample.weekLabel}
      days={sample.days as PlanDay[]}
      onOpenDay={() => {
        /* open that day's workout */
      }}
    />
  );
}
