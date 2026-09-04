import EventIcon from '@mui/icons-material/Event';
import VideocamIcon from '@mui/icons-material/Videocam';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { clockLabel, describe, statusOf, timeLabel, type StatusMap } from '../../../foundation';

export type AppointmentStatus =
  'confirmed' | 'awaitingConfirmation' | 'cancelled' | 'completed' | 'noShow';

export interface Appointment {
  id: string;
  clinician: string;
  specialty?: string;
  start: string;
  timezone: string;
  mode: 'video' | 'inPerson' | 'phone';
  location?: string;
  status: AppointmentStatus;
  /** Minutes before the start when joining opens. */
  joinableFromMinutes?: number;
}

export interface AppointmentCardProps {
  appointment: Appointment;
  now?: Date;
  onJoin?: () => void;
  onReschedule?: () => void;
  onCancel?: () => void;
}

const STATUS: StatusMap<AppointmentStatus> = {
  confirmed: { label: 'Confirmed', color: 'success' },
  awaitingConfirmation: { label: 'Awaiting confirmation', color: 'warning' },
  cancelled: { label: 'Cancelled', color: 'error' },
  completed: { label: 'Completed', color: 'default' },
  noShow: { label: 'Missed', color: 'error' },
};

/**
 * An upcoming or past appointment.
 *
 * The Join button is time-gated rather than always enabled: a video room opened
 * an hour early is a patient sitting alone in it wondering whether they have
 * the wrong link. Before the window, the card says when joining opens.
 */
export function AppointmentCard({
  appointment,
  now = new Date(),
  onJoin,
  onReschedule,
  onCancel,
}: AppointmentCardProps) {
  const presentation = statusOf(STATUS, appointment.status);
  const start = new Date(appointment.start);
  const minutesUntil = (start.getTime() - now.getTime()) / 60_000;
  const window = appointment.joinableFromMinutes ?? 15;
  const joinable = appointment.mode === 'video' && minutesUntil <= window && minutesUntil > -60;
  const active =
    appointment.status === 'confirmed' || appointment.status === 'awaitingConfirmation';

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          {appointment.mode === 'video' ? (
            <VideocamIcon color="action" />
          ) : (
            <EventIcon color="action" />
          )}

          <Stack sx={{ flexGrow: 1, minWidth: 0 }} spacing={0.25}>
            <Typography
              variant="subtitle2"
              fontWeight={700}
              aria-label={describe(
                appointment.clinician,
                appointment.specialty,
                `${clockLabel(appointment.start, undefined, appointment.timezone)} ${appointment.timezone}`,
                timeLabel(appointment.start, undefined, now),
                appointment.mode === 'video'
                  ? 'video consultation'
                  : (appointment.location ?? 'in person'),
                presentation.label,
              )}
            >
              {appointment.clinician}
            </Typography>

            {appointment.specialty ? (
              <Typography variant="caption" color="text.secondary" aria-hidden>
                {appointment.specialty}
              </Typography>
            ) : null}

            <Typography variant="body2" aria-hidden>
              {`${clockLabel(appointment.start, undefined, appointment.timezone)} · ${timeLabel(appointment.start, undefined, now)}`}
            </Typography>
            <Typography variant="caption" color="text.secondary" aria-hidden>
              {appointment.mode === 'video'
                ? `Video · times in ${appointment.timezone}`
                : (appointment.location ?? 'In person')}
            </Typography>
          </Stack>

          <Chip
            size="small"
            label={presentation.label}
            color={presentation.color}
            variant="outlined"
          />
        </Stack>

        {active ? (
          <Stack
            direction="row"
            spacing={1}
            sx={{ mt: 2 }}
            justifyContent="flex-end"
            flexWrap="wrap"
            useFlexGap
          >
            {onCancel ? (
              <Button size="small" color="inherit" onClick={onCancel}>
                Cancel
              </Button>
            ) : null}
            {onReschedule ? (
              <Button size="small" onClick={onReschedule}>
                Reschedule
              </Button>
            ) : null}
            {appointment.mode === 'video' && onJoin ? (
              <Button size="small" variant="contained" disabled={!joinable} onClick={onJoin}>
                {joinable
                  ? 'Join now'
                  : `Opens ${String(Math.ceil(minutesUntil - window))} min before`}
              </Button>
            ) : null}
          </Stack>
        ) : null}
      </CardContent>
    </Card>
  );
}
