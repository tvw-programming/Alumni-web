import { useState } from 'react';

import { RestTimerCircle } from './RestTimerCircle';
import sample from './sample.json';

export function RestTimerCircleUsage() {
  // In a real app the countdown comes from a timer service that keeps running
  // with the screen off. A component cannot do that.
  const [remaining, setRemaining] = useState(sample.remainingSeconds);
  const [running, setRunning] = useState(sample.running);

  return (
    <RestTimerCircle
      totalSeconds={sample.totalSeconds}
      remainingSeconds={remaining}
      running={running}
      nextExerciseName={sample.nextExerciseName}
      onAddTime={(seconds) => {
        setRemaining((current) => current + seconds);
      }}
      onToggleRun={() => {
        setRunning((current) => !current);
      }}
      onSkip={() => {
        setRemaining(0);
      }}
    />
  );
}
