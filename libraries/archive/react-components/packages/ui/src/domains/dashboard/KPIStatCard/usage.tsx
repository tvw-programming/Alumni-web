import { useQuery } from '@tanstack/react-query';

import { KPIStatCard } from './KPIStatCard';
import sample from './sample.json';

export function KPIStatCardUsage() {
  // `isLoading` (first load) drives the skeleton; a background refetch leaves
  // the previous number on screen rather than blanking the tile.
  const metric = useQuery({
    queryKey: ['metrics', 'mrr'],
    queryFn: () => Promise.resolve(sample),
    initialData: sample,
  });

  return (
    <KPIStatCard
      label={metric.data.label}
      value={metric.data.value}
      comparison={metric.data.comparison as KPIStatCardProps['comparison']}
      sparkline={metric.data.sparkline}
      updatedAt={metric.data.updatedAt}
      loading={metric.isLoading}
      pinned={metric.data.pinned}
      // Pinning is the user's own layout preference, so it is optimistic.
      // The metric never is.
      onTogglePin={async (next) => {
        await fetch('/api/dashboard/pins', {
          method: next ? 'PUT' : 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ metric: 'mrr' }),
        });
      }}
    />
  );
}

type KPIStatCardProps = Parameters<typeof KPIStatCard>[0];
