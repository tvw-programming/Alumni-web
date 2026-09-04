import Stack from '@mui/material/Stack';

import { KanbanCard, type KanbanCardData } from '../KanbanCard/KanbanCard';
import cardSample from '../KanbanCard/sample.json';

import { KanbanColumn } from './KanbanColumn';
import sample from './sample.json';

export function KanbanColumnUsage() {
  const card = cardSample.card as unknown as KanbanCardData;

  return (
    <Stack direction="row" spacing={2} sx={{ overflowX: 'auto', pb: 1 }}>
      <KanbanColumn
        title={sample.title}
        count={sample.count}
        wipLimit={sample.wipLimit}
        notice={sample.notice}
        onAddCard={() => {
          /* open the new-card form */
        }}
      >
        <KanbanCard
          card={card}
          moveTargets={cardSample.moveTargets}
          onPress={() => {
            /* open the card */
          }}
          onMove={() => Promise.resolve()}
        />
      </KanbanColumn>
    </Stack>
  );
}
