import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Collapse from '@mui/material/Collapse';
import ListItemButton from '@mui/material/ListItemButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { memo, useState } from 'react';

import { describe, timeLabel } from '../../../foundation';

export interface AuditFieldChange {
  field: string;
  from: string | null;
  to: string | null;
}

export interface AuditEvent {
  id: string;
  actor: string;
  action: string;
  resourceType: string;
  resourceId: string;
  at: string;
  ipAddress?: string;
  requestId?: string;
  changes?: AuditFieldChange[];
  outcome?: 'success' | 'denied' | 'failed';
}

export interface AuditLogRowProps {
  event: AuditEvent;
}

/**
 * One audit entry, expandable to the field-level diff.
 *
 * An audit row that says "Mehul updated invoice 1002" and nothing else is
 * almost useless: the question is always *what* changed. The diff is collapsed
 * rather than absent, so the list stays scannable and the answer is one click
 * away.
 *
 * `null` renders as "(empty)" rather than blank — "changed from blank to blank"
 * is unreadable, and a genuinely empty previous value is meaningful.
 */
export const AuditLogRow = memo(function AuditLogRow({ event }: AuditLogRowProps) {
  const [open, setOpen] = useState(false);
  const hasChanges = (event.changes?.length ?? 0) > 0;

  return (
    <Box>
      <ListItemButton
        onClick={
          hasChanges
            ? () => {
                setOpen((current) => !current);
              }
            : undefined
        }
        aria-expanded={hasChanges ? open : undefined}
        sx={{ alignItems: 'flex-start', gap: 1.5, py: 1 }}
        aria-label={describe(
          event.actor,
          event.action,
          `${event.resourceType} ${event.resourceId}`,
          event.outcome,
          timeLabel(event.at),
          hasChanges ? `${String(event.changes?.length)} field changes` : undefined,
        )}
      >
        <Avatar sx={{ width: 28, height: 28, fontSize: 13 }} alt="">
          {event.actor.charAt(0)}
        </Avatar>

        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="body2" aria-hidden>
            <strong>{event.actor}</strong>
            {` ${event.action} `}
            <Box component="code" sx={{ fontSize: 12 }}>
              {`${event.resourceType}/${event.resourceId}`}
            </Box>
          </Typography>

          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            flexWrap="wrap"
            useFlexGap
            sx={{ mt: 0.25 }}
          >
            <Typography variant="caption" color="text.secondary" aria-hidden>
              {timeLabel(event.at)}
            </Typography>
            {event.ipAddress ? (
              <Typography variant="caption" color="text.secondary" aria-hidden>
                {event.ipAddress}
              </Typography>
            ) : null}
            {event.requestId ? (
              // The id that ties this row to the server log. It is why an audit
              // trail is investigable rather than merely reassuring.
              <Typography
                variant="caption"
                sx={{ fontFamily: 'monospace', opacity: 0.7 }}
                aria-hidden
              >
                {event.requestId.slice(0, 8)}
              </Typography>
            ) : null}
          </Stack>
        </Box>

        {event.outcome && event.outcome !== 'success' ? (
          <Chip
            size="small"
            variant="outlined"
            color={event.outcome === 'denied' ? 'warning' : 'error'}
            label={event.outcome === 'denied' ? 'Denied' : 'Failed'}
          />
        ) : null}
      </ListItemButton>

      <Collapse in={open} unmountOnExit>
        <Stack spacing={0.5} sx={{ pl: 7, pr: 2, pb: 1.5 }}>
          {event.changes?.map((change) => (
            <Stack key={change.field} direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Typography variant="caption" sx={{ minWidth: 120, fontWeight: 600 }}>
                {change.field}
              </Typography>
              <Typography variant="caption" sx={{ textDecoration: 'line-through', opacity: 0.7 }}>
                {change.from ?? '(empty)'}
              </Typography>
              <Typography variant="caption" aria-hidden>
                →
              </Typography>
              <Typography variant="caption" fontWeight={600}>
                {change.to ?? '(empty)'}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </Collapse>
    </Box>
  );
});
