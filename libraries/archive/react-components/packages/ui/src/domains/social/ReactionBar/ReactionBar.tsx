import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import { countLabel, useOptimisticValue } from '../../../foundation';

export interface ReactionSummary {
  /** Count per reaction key. */
  counts: Record<string, number>;
  /** The reaction the viewer has chosen, if any. */
  mine?: string;
}

export interface ReactionOption {
  key: string;
  glyph: string;
  label: string;
}

export interface ReactionBarProps {
  summary: ReactionSummary;
  options: ReactionOption[];
  disabledReason?: string;
  onReact: (key: string | undefined) => Promise<void>;
}

/**
 * Reactions, optimistically.
 *
 * This is the case `useOptimistic` was designed for: the user owns the value,
 * the change is trivially reversible, and waiting for a round trip makes a
 * like button feel broken. React restores the server's value if the request
 * fails — the rollback that optimistic UI normally hand-rolls and gets wrong.
 *
 * The counts move with the toggle so the row stays internally consistent, but
 * they are recomputed from the authoritative summary the moment it arrives.
 */
export function ReactionBar({ summary, options, disabledReason, onReact }: ReactionBarProps) {
  const [mine, react, pending] = useOptimisticValue(summary.mine, async (next) => {
    await onReact(next);
  });

  const counts = { ...summary.counts };
  // Adjust the displayed counts for the predicted choice, so the number under
  // the thumb matches the thumb.
  if (mine !== summary.mine) {
    if (summary.mine) counts[summary.mine] = Math.max(0, (counts[summary.mine] ?? 1) - 1);
    if (mine) counts[mine] = (counts[mine] ?? 0) + 1;
  }

  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);

  return (
    <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" useFlexGap>
      {options.map((option) => {
        const count = counts[option.key] ?? 0;
        const selected = mine === option.key;

        return (
          <Tooltip key={option.key} title={disabledReason ?? option.label}>
            <span>
              <Button
                size="small"
                variant={selected ? 'contained' : 'text'}
                disabled={pending || disabledReason !== undefined}
                // `aria-pressed` is what makes a toggle a toggle. The label
                // states the reaction, the count, and whether it is yours.
                aria-pressed={selected}
                aria-label={`${option.label}, ${countLabel(count)}${selected ? ', your reaction' : ''}`}
                onClick={() => {
                  react(selected ? undefined : option.key);
                }}
                sx={{ minWidth: 0, px: 1, borderRadius: 999 }}
              >
                <Box component="span" aria-hidden sx={{ mr: count > 0 ? 0.5 : 0 }}>
                  {option.glyph}
                </Box>
                {count > 0 ? (
                  <Typography
                    variant="caption"
                    aria-hidden
                    sx={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {countLabel(count)}
                  </Typography>
                ) : null}
              </Button>
            </span>
          </Tooltip>
        );
      })}

      {total > 0 ? (
        <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
          {`${countLabel(total)} total`}
        </Typography>
      ) : null}
    </Stack>
  );
}
