import ListItem from '@mui/material/ListItem';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';

import { describe, useOptimisticValue } from '../../../foundation';

export interface ScheduleTimer {
  id: string;
  label: string;
  /** "07:00" in the schedule's own zone. */
  time: string;
  /** 0 = Sunday. Empty means "once". */
  days: number[];
  action: string;
  enabled: boolean;
  timezone?: string;
}

export interface ScheduleTimerRowProps {
  timer: ScheduleTimer;
  onToggle: (enabled: boolean) => Promise<void>;
  onPress?: () => void;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** "Weekdays" / "Every day" / "Mon, Wed, Fri" — never a row of seven letters. */
function describeDays(days: number[]): string {
  if (days.length === 0) return 'Once';
  if (days.length === 7) return 'Every day';
  const sorted = [...days].sort((a, b) => a - b);
  if (sorted.join() === '1,2,3,4,5') return 'Weekdays';
  if (sorted.join() === '0,6') return 'Weekends';
  return sorted.map((day) => DAY_NAMES[day]).join(', ');
}

/**
 * One schedule entry.
 *
 * The days are words. A row of seven single letters (S M T W T F S) with some
 * bolded is unreadable to a screen reader and ambiguous to everyone — two of
 * those letters are "T" and two are "S".
 *
 * The timezone is printed when the schedule has one, because a heating schedule
 * that silently shifts with travel is a schedule nobody trusts.
 */
export function ScheduleTimerRow({ timer, onToggle, onPress }: ScheduleTimerRowProps) {
  const [enabled, toggle, pending] = useOptimisticValue(timer.enabled, async (next) => {
    await onToggle(next);
  });

  return (
    <ListItem
      divider
      onClick={onPress}
      sx={{ gap: 1.5, cursor: onPress ? 'pointer' : 'default', opacity: enabled ? 1 : 0.7 }}
      aria-label={describe(
        timer.label,
        timer.time,
        describeDays(timer.days),
        timer.action,
        timer.timezone,
        enabled ? 'enabled' : 'disabled',
      )}
    >
      <Stack sx={{ minWidth: 64 }} aria-hidden>
        <Typography variant="h6" fontWeight={700} sx={{ fontVariantNumeric: 'tabular-nums' }}>
          {timer.time}
        </Typography>
      </Stack>

      <Stack sx={{ flexGrow: 1, minWidth: 0 }} aria-hidden>
        <Typography variant="body2" fontWeight={600} noWrap>
          {timer.label}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap>
          {`${describeDays(timer.days)} · ${timer.action}`}
        </Typography>
        {timer.timezone ? (
          <Typography variant="caption" color="text.secondary">
            {timer.timezone}
          </Typography>
        ) : null}
      </Stack>

      <Switch
        checked={enabled}
        disabled={pending}
        onChange={(event) => {
          event.stopPropagation();
          toggle(event.target.checked);
        }}
        onClick={(event) => {
          event.stopPropagation();
        }}
        inputProps={{ 'aria-label': `${enabled ? 'Disable' : 'Enable'} ${timer.label}` }}
      />
    </ListItem>
  );
}
