import { asId, type ContentId } from '../../../foundation';

import { ContentPosterCard, type ContentItem } from './ContentPosterCard';
import sample from './sample.json';

export function ContentPosterCardUsage() {
  const item: ContentItem = {
    ...sample.item,
    id: asId<ContentId>(sample.item.id),
  };

  return (
    <ContentPosterCard
      item={item}
      onPlay={() => {
        /* open the player at the saved position */
      }}
      onToggleWatchlist={async (next) => {
        const response = await fetch(`/api/watchlist/${item.id}`, {
          method: next ? 'PUT' : 'DELETE',
        });
        if (!response.ok) throw await response.json();
      }}
    />
  );
}
