import List from '@mui/material/List';

import { asId, type ContentId } from '../../../foundation';

import { EpisodeListItem, type Episode } from './EpisodeListItem';
import sample from './sample.json';

export function EpisodeListItemUsage() {
  const episode: Episode = { ...sample.episode, id: asId<ContentId>(sample.episode.id) };

  return (
    <List disablePadding>
      <EpisodeListItem
        episode={episode}
        onPlay={() => {
          /* resume at the saved position */
        }}
      />
    </List>
  );
}
