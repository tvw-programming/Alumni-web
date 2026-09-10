import { Box, Stack, Tooltip, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import type { StepTask } from '../../types/workflow';
import { fonts } from '../../theme';
import { statusColor, TASK_STATUS_LABEL } from '../dashboard/StepTasks';
import type { RouteStatus } from './routeStatus';

interface Props {
  tasks: StepTask[];
  /** 'bars' | 'dots' | 'none', from the variant's card block. */
  mode: string;
  status: RouteStatus;
  color: string;
  muted: string;
}

/** Beyond this the bars stop being scannable and become a texture. */
const MAX = 8;

/**
 * The processes inside one step, drawn inside the card.
 *
 * This is the answer to "the card runs several things": micro bars on the one
 * surface, rather than a stack of offset rectangles behind it. A container that
 * looks like a shuffled deck reads as disorganised; one clean surface with
 * ordered internals reads as a system under control.
 *
 * A running task pulses — on a 24-step route that pulse is often the only thing
 * moving, which is exactly the point.
 */
export default function MicroIndicator({ tasks, mode, status, color, muted }: Props) {
  if (mode === 'none') return null;

  const dots = mode === 'dots';

  // No task list: a three-slot array standing for the step itself — done,
  // underway, not started — so every card has the same shape in the same place.
  if (tasks.length === 0) {
    const lit = status === 'cleared' ? 3 : status === 'upcoming' ? 0 : status === 'failed' ? 1 : 2;
    return (
      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }} aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <Box
            key={i}
            className={i === lit - 1 && (status === 'moving' || status === 'waiting') ? 'process-motion' : undefined}
            sx={{
              width: dots ? 5 : 13,
              height: dots ? 5 : 3,
              borderRadius: dots ? '50%' : '1px',
              bgcolor: i < lit ? color : alpha(muted, 0.45),
              ...(i === lit - 1 &&
                (status === 'moving' || status === 'waiting') && {
                  animation: 'processPulse 1200ms ease-in-out infinite',
                }),
            }}
          />
        ))}
      </Stack>
    );
  }

  const shown = tasks.slice(0, MAX);
  const done = tasks.filter((t) => t.status === 'done' || t.status === 'skipped').length;

  return (
    <Tooltip
      arrow
      placement="top"
      title={
        <Stack spacing={0.25} sx={{ py: 0.5 }}>
          {tasks.map((task) => (
            <Stack key={task.id} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Box
                sx={{
                  width: 10,
                  height: 3,
                  borderRadius: '1px',
                  bgcolor: statusColor(task.status),
                  flexShrink: 0,
                }}
              />
              <Typography sx={{ fontSize: 12 }}>{task.title}</Typography>
              <Typography sx={{ fontSize: 11, opacity: 0.7 }}>
                {TASK_STATUS_LABEL[task.status]}
              </Typography>
            </Stack>
          ))}
        </Stack>
      }
    >
      <Stack direction="row" spacing={0.625} sx={{ alignItems: 'center', cursor: 'help', minWidth: 0 }}>
        {shown.map((task) => (
          <Box
            key={task.id}
            className={task.status === 'running' ? 'process-motion' : undefined}
            sx={{
              width: dots ? 5 : 13,
              height: dots ? 5 : 3,
              borderRadius: dots ? '50%' : '1px',
              flexShrink: 0,
              bgcolor: task.status === 'pending' ? alpha(muted, 0.45) : statusColor(task.status),
              ...(task.status === 'running' && {
                animation: 'processPulse 1200ms ease-in-out infinite',
              }),
            }}
          />
        ))}
        <Typography
          sx={{
            pl: 0.25,
            fontFamily: fonts.mono,
            fontSize: 9.5,
            color: 'text.secondary',
            fontVariantNumeric: 'tabular-nums',
            whiteSpace: 'nowrap',
          }}
        >
          {done}/{tasks.length}
        </Typography>
      </Stack>
    </Tooltip>
  );
}
