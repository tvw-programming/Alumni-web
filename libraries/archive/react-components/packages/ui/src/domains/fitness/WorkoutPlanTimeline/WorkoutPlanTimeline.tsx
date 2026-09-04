import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import ListItemButton from '@mui/material/ListItemButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { describe, pluralize } from '../../../foundation';

export interface PlanDay {
  id: string;
  dayLabel: string;
  title: string;
  /** "Rest" days carry no workout and are a first-class entry. */
  kind: 'workout' | 'rest';
  durationLabel?: string;
  completed: boolean;
  isToday?: boolean;
  locked?: boolean;
}

export interface WorkoutPlanTimelineProps {
  planName: string;
  weekLabel: string;
  days: PlanDay[];
  onOpenDay: (id: string) => void;
}

/**
 * A week of a training plan.
 *
 * Progress is stated as **completed of scheduled**, counting only workout days.
 * Including rest days in the denominator makes a plan look unfinished when the
 * user did everything asked of them, which is exactly backwards.
 *
 * A locked day says it is locked rather than being hidden — seeing what is
 * coming is most of why people follow a plan.
 */
export function WorkoutPlanTimeline({
  planName,
  weekLabel,
  days,
  onOpenDay,
}: WorkoutPlanTimelineProps) {
  const workoutDays = days.filter((day) => day.kind === 'workout');
  const completed = workoutDays.filter((day) => day.completed).length;
  const percent = workoutDays.length === 0 ? 0 : (completed / workoutDays.length) * 100;

  return (
    <Box component="section" aria-label={`${planName}, ${weekLabel}`}>
      <Stack direction="row" alignItems="baseline" spacing={1}>
        <Typography variant="subtitle2" fontWeight={700}>
          {planName}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {weekLabel}
        </Typography>
      </Stack>

      <LinearProgress
        variant="determinate"
        value={percent}
        sx={{ mt: 1, height: 6, borderRadius: 3 }}
        // Rest days are not in the denominator.
        aria-label={`${String(completed)} of ${pluralize(workoutDays.length, 'workout')} done this week`}
      />
      <Typography variant="caption" color="text.secondary">
        {`${String(completed)} of ${pluralize(workoutDays.length, 'workout')} done`}
      </Typography>

      <Stack sx={{ mt: 1.5 }}>
        {days.map((day) => (
          <ListItemButton
            key={day.id}
            disabled={day.locked === true}
            onClick={() => {
              onOpenDay(day.id);
            }}
            sx={{
              gap: 1.5,
              borderLeft: 3,
              borderColor: day.isToday === true ? 'primary.main' : 'transparent',
              opacity: day.completed ? 0.7 : 1,
            }}
            aria-current={day.isToday === true ? 'date' : undefined}
            aria-label={describe(
              day.dayLabel,
              day.kind === 'rest' ? 'Rest day' : day.title,
              day.durationLabel,
              day.completed ? 'completed' : undefined,
              day.isToday === true ? 'today' : undefined,
              day.locked === true ? 'locked until earlier days are done' : undefined,
            )}
          >
            {day.completed ? (
              <CheckCircleIcon color="success" fontSize="small" />
            ) : (
              <RadioButtonUncheckedIcon color="disabled" fontSize="small" />
            )}

            <Box sx={{ flexGrow: 1, minWidth: 0 }} aria-hidden>
              <Stack direction="row" spacing={1} alignItems="baseline">
                <Typography variant="caption" color="text.secondary" sx={{ minWidth: 52 }}>
                  {day.dayLabel}
                </Typography>
                <Typography
                  variant="body2"
                  fontWeight={day.isToday === true ? 700 : 500}
                  noWrap
                  sx={{ textDecoration: day.completed ? 'line-through' : 'none' }}
                >
                  {day.kind === 'rest' ? 'Rest day' : day.title}
                </Typography>
              </Stack>
              {day.durationLabel ? (
                <Typography variant="caption" color="text.secondary" sx={{ ml: 7.5 }}>
                  {day.durationLabel}
                </Typography>
              ) : null}
            </Box>

            {day.isToday === true ? (
              <Chip size="small" color="primary" label="Today" aria-hidden />
            ) : null}
            {day.locked === true ? (
              <Chip size="small" variant="outlined" label="Locked" aria-hidden />
            ) : null}
          </ListItemButton>
        ))}
      </Stack>
    </Box>
  );
}
