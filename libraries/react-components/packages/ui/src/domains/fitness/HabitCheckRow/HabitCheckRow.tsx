import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import Box from '@mui/material/Box';
import Checkbox from '@mui/material/Checkbox';
import ListItem from '@mui/material/ListItem';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { memo } from 'react';

import { describe, pluralize, useOptimisticValue } from '../../../foundation';

export interface Habit {
  id: string;
  name: string;
  /** Most recent first; `true` means done that day. */
  lastSevenDays: boolean[];
  streakDays: number;
  doneToday: boolean;
  cadenceLabel?: string;
}

export interface HabitCheckRowProps {
  habit: Habit;
  onToggleToday: (done: boolean) => Promise<void>;
}

const DAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/**
 * One habit, its streak and the last seven days.
 *
 * The seven-day strip is `aria-hidden` and summarised in the row's label as
 * *"5 of the last 7 days"*. Seven coloured squares are meaningless to a screen
 * reader, and the count is what a person reads off them anyway.
 *
 * A broken streak is stated without commentary — the number simply returns to
 * zero. Habit trackers that scold do not get opened again.
 */
export const HabitCheckRow = memo(function HabitCheckRow({
  habit,
  onToggleToday,
}: HabitCheckRowProps) {
  const [done, toggle, pending] = useOptimisticValue(habit.doneToday, async (next) => {
    await onToggleToday(next);
  });

  const completedDays = habit.lastSevenDays.filter(Boolean).length;

  return (
    <ListItem
      divider
      sx={{ gap: 1.5, opacity: pending ? 0.7 : 1 }}
      aria-label={describe(
        habit.name,
        habit.cadenceLabel,
        done ? 'done today' : 'not done today',
        habit.streakDays > 0 ? `${pluralize(habit.streakDays, 'day')} streak` : 'no streak',
        `${String(completedDays)} of the last 7 days`,
      )}
    >
      <Checkbox
        checked={done}
        disabled={pending}
        inputProps={{
          'aria-label': done
            ? `Mark ${habit.name} not done today`
            : `Mark ${habit.name} done today`,
        }}
        onChange={(event) => {
          toggle(event.target.checked);
        }}
      />

      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography variant="body2" fontWeight={600} noWrap aria-hidden>
          {habit.name}
        </Typography>
        {habit.cadenceLabel ? (
          <Typography variant="caption" color="text.secondary" aria-hidden>
            {habit.cadenceLabel}
          </Typography>
        ) : null}
      </Box>

      {/* Decorative: the count is in the row label. */}
      <Stack direction="row" spacing={0.25} aria-hidden>
        {habit.lastSevenDays.map((completed, index) => (
          <Stack key={index} alignItems="center" spacing={0.25}>
            <Box
              sx={{
                width: 14,
                height: 14,
                borderRadius: 0.5,
                bgcolor: completed ? 'success.main' : 'action.disabledBackground',
              }}
            />
            <Typography variant="caption" sx={{ fontSize: 9, color: 'text.disabled' }}>
              {DAY_INITIALS[index % 7]}
            </Typography>
          </Stack>
        ))}
      </Stack>

      {habit.streakDays > 0 ? (
        <Stack direction="row" spacing={0.25} alignItems="center" aria-hidden>
          <LocalFireDepartmentIcon sx={{ fontSize: 16, color: 'warning.main' }} />
          <Typography variant="caption" fontWeight={700}>
            {habit.streakDays}
          </Typography>
        </Stack>
      ) : null}
    </ListItem>
  );
});
