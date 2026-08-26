import MoreVertIcon from '@mui/icons-material/MoreVert';
import Avatar from '@mui/material/Avatar';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { memo, useState } from 'react';

import { describe, timeLabel, type TaskId } from '../../../foundation';

export interface KanbanCardData {
  id: TaskId;
  title: string;
  columnId: string;
  labels?: string[];
  dueDate?: string;
  assignee?: { id: string; name: string; avatarUri?: string };
  blocked?: string;
}

export interface KanbanCardProps {
  card: KanbanCardData;
  /** Every other column, so the card can be moved without dragging. */
  moveTargets: { id: string; label: string }[];
  onPress: () => void;
  onMove: (toColumnId: string) => Promise<void>;
}

/**
 * A board card.
 *
 * The menu is not a convenience — it is the **only** way this card can be moved
 * without a pointer. Drag and drop is unusable by keyboard and by screen reader,
 * so "Move to In progress" is the accessible path and it exists on every card
 * whether or not dragging is wired up.
 *
 * Moving is the parent's Action: the mutation needs source column, destination
 * column and position, and only the board knows the position.
 */
export const KanbanCard = memo(function KanbanCard({
  card,
  moveTargets,
  onPress,
  onMove,
}: KanbanCardProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  return (
    <Card
      variant="outlined"
      sx={{ cursor: 'pointer', borderColor: card.blocked ? 'warning.main' : 'divider' }}
    >
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Stack direction="row" spacing={1} alignItems="flex-start">
          <Stack
            sx={{ flexGrow: 1, minWidth: 0 }}
            onClick={onPress}
            aria-label={describe(
              card.title,
              card.labels?.join(', '),
              card.dueDate ? `due ${timeLabel(card.dueDate)}` : undefined,
              card.assignee ? `assigned to ${card.assignee.name}` : 'unassigned',
              card.blocked ? `blocked: ${card.blocked}` : undefined,
            )}
          >
            <Typography variant="body2" fontWeight={600} aria-hidden>
              {card.title}
            </Typography>

            {card.blocked ? (
              <Typography variant="caption" color="warning.main" aria-hidden>
                {`Blocked · ${card.blocked}`}
              </Typography>
            ) : null}

            {card.labels?.length ? (
              <Stack
                direction="row"
                spacing={0.5}
                flexWrap="wrap"
                useFlexGap
                sx={{ mt: 0.75 }}
                aria-hidden
              >
                {card.labels.map((label) => (
                  <Chip key={label} size="small" variant="outlined" label={label} />
                ))}
              </Stack>
            ) : null}
          </Stack>

          <IconButton
            size="small"
            aria-label={`Move ${card.title}`}
            onClick={(event) => {
              setAnchor(event.currentTarget);
            }}
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>

          <Menu
            anchorEl={anchor}
            open={anchor !== null}
            onClose={() => {
              setAnchor(null);
            }}
          >
            {moveTargets.map((target) => (
              <MenuItem
                key={target.id}
                onClick={() => {
                  setAnchor(null);
                  void onMove(target.id);
                }}
              >
                {`Move to ${target.label}`}
              </MenuItem>
            ))}
          </Menu>
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }} aria-hidden>
          {card.dueDate ? (
            <Typography variant="caption" color="text.secondary">
              {timeLabel(card.dueDate).split(' (')[0]}
            </Typography>
          ) : null}
          {card.assignee ? (
            <Avatar
              src={card.assignee.avatarUri}
              alt=""
              sx={{ width: 22, height: 22, fontSize: 11, ml: 'auto' }}
            >
              {card.assignee.name.charAt(0)}
            </Avatar>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
});
