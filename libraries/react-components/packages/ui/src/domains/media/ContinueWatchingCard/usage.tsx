import Stack from '@mui/material/Stack';

import { asId, type ContentId } from '../../../foundation';

import { ContinueWatchingCard, type ContinueWatchingItem } from './ContinueWatchingCard';
import sample from './sample.json';

export function ContinueWatchingCardUsage() {
  const item: ContinueWatchingItem = { ...sample.item, id: asId<ContentId>(sample.item.id) };

  return (
    <Stack direction="row" spacing={2}>
      <ContinueWatchingCard
        item={item}
        onResume={() => {
          /* open the player at the saved position */
        }}
        onRemove={async () => {
          const response = await fetch(`/api/continue-watching/${item.id}`, { method: 'DELETE' });
          if (!response.ok) throw await response.json();
        }}
      />
    </Stack>
  );
}
