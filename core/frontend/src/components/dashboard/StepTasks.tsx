import { Box, LinearProgress, Stack, Tooltip, Typography } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import RemoveIcon from '@mui/icons-material/Remove';
import { useMemo } from 'react';

import type { StepTask, TaskStatus } from '../../types/workflow';
import { fonts, tokens } from '../../theme';

interface Props {
  tasks: StepTask[];
  /** Compact hides titles and shows only the pips — for a dense table row. */
  dense?: boolean;
  /** Dense only: drop the n/m text where the row has no width for it. */
  hideCount?: boolean;
}

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  pending: 'Not started',
  running: 'Running',
  done: 'Done',
  failed: 'Failed',
  skipped: 'Skipped',
};

export function statusColor(status: TaskStatus): string {
  switch (status) {
    case 'done':
      return tokens.pass;
    case 'running':
      return tokens.signal;
    case 'failed':
      return tokens.fail;
    default:
      return tokens.rule;
  }
}

/**
 * The tasks inside one step.
 *
 * Two decisions worth keeping:
 *
 * **Pending tasks are drawn, not omitted.** The whole checklist is declared
 * before any of it runs, so this shows "2 of 4" rather than growing a row at a
 * time. A list that only appears as work completes cannot tell you how much is
 * left, which is the number someone watching actually wants.
 *
 * **Duration sits on the tooltip, not the row.** A step with four tasks is
 * scanned for *where it is*, and four numbers in the row defeat that. The
 * detail is one hover away for whoever needs it.
 */
export default function StepTasks({ tasks, dense = false, hideCount = false }: Props) {
  const { done, total, running } = useMemo(() => {
    const finished = tasks.filter((t) => t.status === 'done' || t.status === 'skipped').length;
    return {
      done: finished,
      total: tasks.length,
      running: tasks.find((t) => t.status === 'running') ?? null,
    };
  }, [tasks]);

  if (tasks.length === 0) return null;

  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  const failed = tasks.some((t) => t.status === 'failed');

  if (dense) {
    return (
      <Tooltip
        arrow
        placement="left"
        title={
          <Stack spacing={0.5} sx={{ py: 0.5 }}>
            {tasks.map((task) => (
              <Stack key={task.id} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <TaskGlyph status={task.status} />
                <Typography sx={{ fontSize: 12 }}>{task.title}</Typography>
                {task.durationMs !== null && (
                  <Typography sx={{ fontSize: 11, opacity: 0.7, fontVariantNumeric: 'tabular-nums' }}>
                    {(task.durationMs / 1000).toFixed(1)}s
                  </Typography>
                )}
              </Stack>
            ))}
          </Stack>
        }
      >
        {/* One pip per task: the shape of progress, readable at row height. */}
        <Stack direction="row" spacing={0.375} sx={{ alignItems: 'center', cursor: 'help' }}>
          {tasks.map((task) => (
            <Box
              key={task.id}
              sx={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                bgcolor: statusColor(task.status),
                // Running pulses, so the eye finds the live step in a table of 24.
                animation:
                  task.status === 'running' ? 'stepTaskPulse 1.2s ease-in-out infinite' : 'none',
                '@keyframes stepTaskPulse': { '50%': { opacity: 0.35 } },
                '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
              }}
            />
          ))}
          {!hideCount && (
            <Typography
              sx={{
                ml: 0.5,
                fontSize: 11,
                color: 'text.secondary',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {done}/{total}
            </Typography>
          )}
        </Stack>
      </Tooltip>
    );
  }

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline', mb: 0.5 }}>
        <Typography
          sx={{
            fontFamily: fonts.mono,
            fontSize: 10.5,
            letterSpacing: '.08em',
            textTransform: 'uppercase',
            color: 'text.secondary',
          }}
        >
          Tasks
        </Typography>
        <Typography sx={{ fontSize: 11.5, color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>
          {done} of {total}
          {running ? ` · ${running.title}` : ''}
        </Typography>
      </Stack>

      <LinearProgress
        variant="determinate"
        value={percent}
        color={failed ? 'error' : percent === 100 ? 'success' : 'warning'}
        sx={{ height: 4, borderRadius: 2, mb: 1 }}
      />

      <Stack spacing={0.25}>
        {tasks.map((task) => (
          <Stack
            key={task.id}
            direction="row"
            spacing={1}
            sx={{ alignItems: 'center', py: 0.25 }}
          >
            <TaskGlyph status={task.status} />
            <Typography
              sx={{
                fontSize: 13,
                flex: 1,
                color: task.status === 'pending' ? 'text.secondary' : 'text.primary',
              }}
            >
              {task.title}
            </Typography>
            {task.detail && (
              <Typography
                sx={{
                  fontFamily: fonts.mono,
                  fontSize: 11,
                  color: task.status === 'failed' ? tokens.fail : 'text.secondary',
                  maxWidth: '18rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={task.detail}
              >
                {task.detail}
              </Typography>
            )}
            {task.durationMs !== null && (
              <Typography
                sx={{ fontSize: 11, color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}
              >
                {(task.durationMs / 1000).toFixed(1)}s
              </Typography>
            )}
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}

/** Shape as well as colour, so status survives greyscale. */
export function TaskGlyph({ status }: { status: TaskStatus }) {
  const color = statusColor(status);

  if (status === 'done') {
    return <CheckIcon aria-label="Done" sx={{ fontSize: 14, color }} />;
  }
  if (status === 'failed') {
    return <CloseIcon aria-label="Failed" sx={{ fontSize: 14, color }} />;
  }
  if (status === 'skipped') {
    return <RemoveIcon aria-label="Skipped" sx={{ fontSize: 14, color }} />;
  }
  return (
    <Box
      aria-label={TASK_STATUS_LABEL[status]}
      sx={{
        width: 10,
        height: 10,
        ml: '2px',
        mr: '2px',
        borderRadius: '50%',
        border: `2px solid ${color}`,
        boxSizing: 'border-box',
        animation: status === 'running' ? 'taskGlyphPulse 1.2s ease-in-out infinite' : 'none',
        '@keyframes taskGlyphPulse': { '50%': { opacity: 0.3 } },
        '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
      }}
    />
  );
}
