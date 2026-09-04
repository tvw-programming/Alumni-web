import { asId, type ContentId } from '../../../foundation';

import { ContentPosterCard, type ContentItem } from '../ContentPosterCard/ContentPosterCard';

import { ContentCarousel } from './ContentCarousel';
import sample from './sample.json';

export function ContentCarouselUsage() {
  const items: ContentItem[] = sample.items.map((item) => ({
    ...item,
    id: asId<ContentId>(item.id),
  }));

  return (
    <ContentCarousel title={sample.title} itemCount={items.length}>
      {items.map((item) => (
        <ContentPosterCard
          key={item.id}
          item={item}
          onPlay={() => {
            /* play */
          }}
        />
      ))}
    </ContentCarousel>
  );
}
