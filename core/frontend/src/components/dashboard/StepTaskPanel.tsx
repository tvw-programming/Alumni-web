import { useEffect, useMemo, useState } from 'react';
import { Box, Button, Card, Chip, LinearProgress, Stack, Tooltip, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';

import type { RunStep, StepTask } from '../../types/workflow';
import { fonts, statusMeta, tokens } from '../../theme';
import { focusedStep } from '../../hooks/useKeepStepInView';
import { TASK_STATUS_LABEL, TaskGlyph, statusColor } from './StepTasks';

interface Props {
  steps: RunStep[];
  /** Opens the full step dialog — the panel is a summary, not a replacement. */
  onInspect?: (step: RunStep) => void;
}

/**
 * The tasks of one step, in a container of its own beneath the route.
 *
 * Why a dedicated box rather than more height on each card: the route is
 * twenty-four cards wide and each is 240px, so a checklist drawn inside one
 * would be four lines of 9px text — and twenty-four checklists at once is a
 * hundred rows of noise for a reader who only ever cares about the step the run
 * is actually on. The cards keep a pip strip, which answers "how far in", and
 * this panel answers "doing what" with the width to say it properly.
 *
 * It follows the run by default and pins when a reader picks a step, because a
 * panel that jumps to step 07 while you are reading step 03 is unusable during
 * a live run.
 */
export default function StepTaskPanel({ steps, onInspect }: Props) {
  const [pinned, setPinned] = useState<number | null>(null);

  const following = focusedStep(steps)?.step ?? steps[0]?.step ?? null;
  const shownStep = pinned ?? following;
  const step = steps.find((s) => s.step === shownStep) ?? null;

  // A pin on a step the run has since left is still a pin; a pin on a step that
  // vanished (a new run, a different pipeline) is not.
  useEffect(() => {
    if (pinned !== null && !steps.some((s) => s.step === pinned)) setPinned(null);
  }, [pinned, steps]);

  const counts = useMemo(() => tally(step?.tasks ?? []), [step]);

  if (!step) return null;

  const meta = statusMeta[step.status];
  const percent = counts.total === 0 ? 0 : Math.round((counts.settled / counts.total) * 100);

  return (
    <Card sx={{ mt: 2, bgcolor: tokens.panel, border: `1px solid ${tokens.rule}` }}>
      {/* The step strip: which step the panel is showing, and the shape of the
          whole run's task progress in one line. */}
      <Stack
        direction="row"
        spacing={0.75}
        sx={{
          alignItems: 'center',
          px: 1.5,
          py: 1,
          borderBottom: `1px solid ${tokens.rule}`,
          overflowX: 'auto',
          '&::-webkit-scrollbar': { height: 6 },
        }}
      >
        <Typography
          sx={{
            fontFamily: fonts.mono,
            fontSize: 10,
            letterSpacing: '.12em',
            color: 'text.secondary',
            flexShrink: 0,
            mr: 0.5,
          }}
        >
          TASKS
        </Typography>

        {steps.map((s) => {
          const t = tally(s.tasks);
          const active = s.step === shownStep;
          const color = statusMeta[s.status].color;
          return (
            <Tooltip
              key={s.step}
              arrow
              title={`${String(s.step).padStart(2, '0')} · ${s.title}${
                t.total > 0 ? ` — ${t.settled}/${t.total} tasks` : ' — no tasks yet'
              }`}
            >
              <Box
                component="button"
                type="button"
                aria-pressed={active}
                onClick={() => setPinned(s.step)}
                sx={{
                  flexShrink: 0,
                  width: 30,
                  border: `1px solid ${active ? color : tokens.rule}`,
                  bgcolor: active ? alpha(color, 0.16) : 'transparent',
                  borderRadius: 1,
                  px: 0,
                  py: 0.5,
                  cursor: 'pointer',
                  font: 'inherit',
                  '&:hover': { borderColor: alpha(color, 0.7) },
                  '&:focus-visible': { outline: `2px solid ${color}`, outlineOffset: 2 },
                }}
              >
                <Typography
                  sx={{
                    fontFamily: fonts.mono,
                    fontSize: 10,
                    color: active ? color : 'text.secondary',
                    lineHeight: 1.4,
                  }}
                >
                  {String(s.step).padStart(2, '0')}
                </Typography>
                {/* A two-pixel bar is the whole story at this size: how much of
                    this step's checklist is behind it. */}
                <Box sx={{ mt: 0.25, mx: 'auto', width: 18, height: 2, bgcolor: tokens.rule }}>
                  <Box
                    sx={{
                      width: `${t.total === 0 ? 0 : (t.settled / t.total) * 100}%`,
                      height: '100%',
                      bgcolor: t.failed ? tokens.fail : color,
                    }}
                  />
                </Box>
              </Box>
            </Tooltip>
          );
        })}
      </Stack>

      <Box sx={{ p: { xs: 1.75, md: 2.25 } }}>
        <Stack
          direction="row"
          spacing={2}
          sx={{ alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', mb: 1.25 }}
        >
          <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', minWidth: 0 }}>
            <Typography sx={{ fontFamily: fonts.mono, fontSize: 12, color: meta.color, flexShrink: 0 }}>
              {String(step.step).padStart(2, '0')}
            </Typography>
            <Typography sx={{ fontSize: 15, fontWeight: 700, minWidth: 0 }} noWrap>
              {step.title}
            </Typography>
            <Chip
              size="small"
              label={meta.label}
              sx={{
                color: meta.color,
                bgcolor: alpha(meta.color, 0.1),
                border: `1px solid ${alpha(meta.color, 0.3)}`,
                fontFamily: fonts.mono,
                fontSize: 9.5,
                flexShrink: 0,
              }}
            />
          </Stack>

          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexShrink: 0 }}>
            <Typography
              sx={{ fontSize: 11.5, color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}
            >
              {counts.total === 0 ? 'no tasks' : `${counts.settled} of ${counts.total} tasks`}
            </Typography>
            {pinned === null ? (
              <Chip
                size="small"
                icon={<MyLocationIcon sx={{ fontSize: 13 }} />}
                label="Following the run"
                sx={{ fontSize: 10.5, color: 'text.secondary', border: `1px solid ${tokens.rule}` }}
                variant="outlined"
              />
            ) : (
              <Button size="small" startIcon={<MyLocationIcon sx={{ fontSize: 14 }} />} onClick={() => setPinned(null)}>
                Follow run
              </Button>
            )}
            {onInspect && (
              <Button
                size="small"
                startIcon={<OpenInFullIcon sx={{ fontSize: 14 }} />}
                onClick={() => onInspect(step)}
              >
                Open step
              </Button>
            )}
          </Stack>
        </Stack>

        <LinearProgress
          variant="determinate"
          value={percent}
          color={counts.failed ? 'error' : percent === 100 ? 'success' : 'warning'}
          sx={{ height: 4, borderRadius: 2, mb: 1.5 }}
        />

        {step.tasks.length === 0 ? (
          <Typography sx={{ fontSize: 12.5, color: 'text.secondary', py: 1 }}>
            {step.status === 'PENDING'
              ? 'This step has not started — its tasks are declared when it does.'
              : 'No tasks were recorded for this step.'}
          </Typography>
        ) : (
          // A grid, not a list: the panel is full-page width and a single column
          // of four rows wastes it. Cells are wide enough for a task title plus
          // its detail, and wrap to one column on a narrow window.
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: 1,
            }}
          >
            {step.tasks.map((task) => (
              <TaskCell key={task.id} task={task} />
            ))}
          </Box>
        )}
      </Box>
    </Card>
  );
}

function TaskCell({ task }: { task: StepTask }) {
  const color = statusColor(task.status);
  const live = task.status === 'running';

  return (
    <Stack
      direction="row"
      spacing={1.25}
      sx={{
        alignItems: 'center',
        px: 1.25,
        py: 1,
        borderRadius: 1,
        border: `1px solid ${live ? alpha(color, 0.5) : tokens.rule}`,
        bgcolor: live ? alpha(color, 0.07) : tokens.panelRaised,
        minWidth: 0,
      }}
    >
      <TaskGlyph status={task.status} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          sx={{
            fontSize: 13,
            lineHeight: 1.3,
            color: task.status === 'pending' ? 'text.secondary' : 'text.primary',
          }}
          noWrap
          title={task.title}
        >
          {task.title}
        </Typography>
        {task.detail && (
          <Typography
            sx={{
              fontFamily: fonts.mono,
              fontSize: 10.5,
              color: task.status === 'failed' ? tokens.fail : 'text.secondary',
            }}
            noWrap
            title={task.detail}
          >
            {task.detail}
          </Typography>
        )}
      </Box>
      <Stack sx={{ alignItems: 'flex-end', flexShrink: 0 }}>
        <Typography
          sx={{ fontFamily: fonts.mono, fontSize: 9.5, letterSpacing: '.06em', color, textTransform: 'uppercase' }}
        >
          {TASK_STATUS_LABEL[task.status]}
        </Typography>
        {task.durationMs !== null && (
          <Typography
            sx={{ fontSize: 10.5, color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}
          >
            {(task.durationMs / 1000).toFixed(1)}s
          </Typography>
        )}
      </Stack>
    </Stack>
  );
}

function tally(tasks: StepTask[]) {
  return {
    total: tasks.length,
    settled: tasks.filter((t) => t.status === 'done' || t.status === 'skipped').length,
    failed: tasks.some((t) => t.status === 'failed'),
  };
}
