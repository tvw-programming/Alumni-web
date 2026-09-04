import { KanbanCard, type KanbanCardData } from './KanbanCard';
import sample from './sample.json';

export function KanbanCardUsage() {
  const card = sample.card as unknown as KanbanCardData;

  return (
    <KanbanCard
      card={card}
      moveTargets={sample.moveTargets}
      onPress={() => {
        /* open the card */
      }}
      // The mutation carries source, destination and position — the board owns
      // the position, which is why the Action lives above the card.
      onMove={async (toColumnId) => {
        const response = await fetch(`/api/tasks/${card.id}/move`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ from: card.columnId, to: toColumnId, position: 0 }),
        });
        if (!response.ok) throw await response.json();
      }}
    />
  );
}
