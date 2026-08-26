import { AppointmentCard, type Appointment } from './AppointmentCard';
import sample from './sample.json';

export function AppointmentCardUsage() {
  const appointment = sample.appointment as Appointment;
  // `now` is injected so the join window is testable and so a demo can show the
  // joinable state without waiting for the clock.
  const now = new Date(new Date(appointment.start).getTime() - 5 * 60_000);

  return (
    <AppointmentCard
      appointment={appointment}
      now={now}
      onJoin={() => {
        /* open the consultation room */
      }}
      onReschedule={() => {
        /* open AppointmentSlotGrid */
      }}
      onCancel={() => {
        /* confirm, then cancel */
      }}
    />
  );
}
