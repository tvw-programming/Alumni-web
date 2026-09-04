import AddIcon from '@mui/icons-material/Add';
import CheckIcon from '@mui/icons-material/Check';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';

import { useOptimisticValue, type ContentId } from '../../../foundation';

export interface WatchlistToggleProps {
  contentId: ContentId;
  title: string;
  inWatchlist: boolean;
  variant?: 'icon' | 'button';
  onToggle: (next: boolean) => Promise<void>;
}

/**
 * Add to / remove from the watchlist.
 *
 * `useOptimistic`: the user's own list, reversible, and a tick that waits for a
 * round trip is noticeable on every poster in a rail. React restores the
 * server's value if the request fails.
 *
 * The label names the *action*, not the state — "Add Dune to watchlist" /
 * "Remove Dune from watchlist" — and `aria-pressed` carries the state. A button
 * labelled "In watchlist" leaves a screen-reader user guessing what pressing it
 * does.
 */
export function WatchlistToggle({
  title,
  inWatchlist,
  variant = 'icon',
  onToggle,
}: WatchlistToggleProps) {
  const [saved, toggle, pending] = useOptimisticValue(inWatchlist, async (next) => {
    await onToggle(next);
  });

  const label = saved ? `Remove ${title} from watchlist` : `Add ${title} to watchlist`;

  if (variant === 'button') {
    return (
      <Button
        variant={saved ? 'contained' : 'outlined'}
        startIcon={saved ? <CheckIcon /> : <AddIcon />}
        disabled={pending}
        aria-pressed={saved}
        aria-label={label}
        onClick={() => {
          toggle(!saved);
        }}
      >
        {saved ? 'In watchlist' : 'Watchlist'}
      </Button>
    );
  }

  return (
    <Tooltip title={label}>
      <span>
        <IconButton
          size="small"
          disabled={pending}
          aria-pressed={saved}
          aria-label={label}
          onClick={() => {
            toggle(!saved);
          }}
          sx={{
            bgcolor: 'rgba(0,0,0,0.45)',
            color: 'common.white',
            '&:hover': { bgcolor: 'rgba(0,0,0,0.65)' },
          }}
        >
          {saved ? <CheckIcon fontSize="small" /> : <AddIcon fontSize="small" />}
        </IconButton>
      </span>
    </Tooltip>
  );
}
