import Stack from '@mui/material/Stack';

import { asId, type ContentId } from '../../../foundation';

import sample from './sample.json';
import { WatchlistToggle } from './WatchlistToggle';

export function WatchlistToggleUsage() {
  return (
    <Stack direction="row" spacing={2} alignItems="center">
      <WatchlistToggle
        contentId={asId<ContentId>(sample.contentId)}
        title={sample.title}
        inWatchlist={sample.inWatchlist}
        variant="button"
        onToggle={async (next) => {
          const response = await fetch(`/api/watchlist/${sample.contentId}`, {
            method: next ? 'PUT' : 'DELETE',
          });
          if (!response.ok) throw await response.json();
        }}
      />
      <WatchlistToggle
        contentId={asId<ContentId>(sample.contentId)}
        title={sample.title}
        inWatchlist
        variant="icon"
        onToggle={() => Promise.resolve()}
      />
    </Stack>
  );
}
