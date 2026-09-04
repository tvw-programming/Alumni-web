import { useState } from 'react';

import { DashboardChartCard } from './DashboardChartCard';
import sample from './sample.json';

export function DashboardChartCardUsage() {
  const [range, setRange] = useState(sample.activeRange);

  return (
    <DashboardChartCard
      title={sample.title}
      points={sample.points}
      // Written by the server alongside the series, so the sentence and the
      // numbers cannot disagree.
      summary={sample.summary}
      valueFormatter={(value) => `₹${(value / 100000).toFixed(1)}L`}
      ranges={sample.ranges}
      activeRange={range}
      updatedAt={sample.updatedAt}
      // The range is query state; saving it as a dashboard preference would be
      // a separate Action.
      onRangeChange={setRange}
    />
  );
}
