import AddIcon from '@mui/icons-material/Add';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { pluralize } from '../../../foundation';

import type { ReactNode } from 'react';

export interface KanbanColumnProps {
  title: string;
  count: number;
  /** Work-in-progress limit. Exceeding it is shown, never enforced silently. */
  wipLimit?: number;
  children: ReactNode;
  /** Set after a rejected move, e.g. "Column limit reached." */
  notice?: string;
  onAddCard?: () => void;
}

/**
 * One board column.
 *
 * A WIP limit is **surfaced, not silently enforced**. Blocking a drop with no
 * explanation reads as a broken board; showing "5 of 4 — over limit" tells the
 * team what the board is trying to say, which is the entire purpose of the
 * limit.
 *
 * The column is a labelled region with a count, so a screen-reader user can
 * navigate between columns and know how many cards each holds without stepping
 * through all of them.
 */
export function KanbanColumn({
  title,
  count,
  wipLimit,
  children,
  notice,
  onAddCard,
}: KanbanColumnProps) {
  const overLimit = wipLimit !== undefined && count > wipLimit;

  return (
    <Paper
      variant="outlined"
      component="section"
      aria-label={`${title}, ${pluralize(count, 'card')}${overLimit ? ', over the work-in-progress limit' : ''}`}
      sx={{
        width: 280,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'action.hover',
        maxHeight: '100%',
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1} sx={{ p: 1.5, pb: 1 }}>
        <Typography variant="subtitle2" fontWeight={700} noWrap>
          {title}
        </Typography>
        <Chip
          size="small"
          label={wipLimit === undefined ? count : `${String(count)}/${String(wipLimit)}`}
          color={overLimit ? 'warning' : 'default'}
          variant="outlined"
          aria-hidden
        />
        {onAddCard ? (
          <Button
            size="small"
            startIcon={<AddIcon />}
            onClick={onAddCard}
            sx={{ ml: 'auto', minWidth: 0 }}
            aria-label={`Add a card to ${title}`}
          >
            Add
          </Button>
        ) : null}
      </Stack>

      {overLimit ? (
        <Alert severity="warning" sx={{ mx: 1, mb: 1, py: 0 }}>
          {`Over the limit of ${String(wipLimit)}.`}
        </Alert>
      ) : null}

      {notice ? (
        <Alert severity="info" sx={{ mx: 1, mb: 1, py: 0 }} role="status">
          {notice}
        </Alert>
      ) : null}

      <Stack spacing={1} sx={{ p: 1, pt: 0, overflowY: 'auto', flexGrow: 1, minHeight: 80 }}>
        {count === 0 ? (
          <Box sx={{ py: 3, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              Nothing here yet
            </Typography>
          </Box>
        ) : (
          children
        )}
      </Stack>
    </Paper>
  );
}
