import { asId, type ContentId } from '../../../foundation';

import { HeroBanner, type HeroTitle } from './HeroBanner';
import sample from './sample.json';

export function HeroBannerUsage() {
  const title: HeroTitle = { ...sample.title, id: asId<ContentId>(sample.title.id) };

  return (
    <HeroBanner
      title={title}
      onPlay={() => {
        /* open the player at the saved position */
      }}
      onMoreInfo={() => {
        /* open the title page */
      }}
      onToggleWatchlist={async (next) => {
        const response = await fetch(`/api/watchlist/${title.id}`, {
          method: next ? 'PUT' : 'DELETE',
        });
        if (!response.ok) throw await response.json();
      }}
    />
  );
}
