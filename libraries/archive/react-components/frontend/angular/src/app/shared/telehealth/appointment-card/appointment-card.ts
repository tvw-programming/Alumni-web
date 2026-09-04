import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

import { Appointment, AppointmentStatus, ConsultationMode } from '../_core/telehealth.types';

/** Minutes before the start when a video room opens. */
const JOIN_WINDOW_MINUTES = 15;

const STATUS_LABELS: Readonly<Record<AppointmentStatus, string>> = {
  requested: 'Awaiting confirmation',
  booked: 'Booked',
  confirmed: 'Confirmed',
  checkedIn: 'Checked in',
  inProgress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  noShow: 'Missed',
  rescheduled: 'Rescheduled',
};

const MODE_LABELS: Readonly<Record<ConsultationMode, string>> = {
  video: 'Video visit',
  audio: 'Phone visit',
  chat: 'Chat visit',
  inPerson: 'In clinic',
};

/**
 * One appointment in a list.
 *
 * Benchmarks in ./README.md — Teladoc and Amwell for the status-led layout and
 * the join action, MyChart for cancellation policy wording.
 *
 * The behaviour that matters most, and which the source scaffold got wrong:
 * **Join is time-gated.** That scaffold showed Join for any telehealth
 * appointment that was not cancelled — including one three weeks away, which
 * leads to a patient sitting in an empty room and calling support. Here the
 * button appears inside a window before the start, and outside it the card says
 * when the room opens.
 *
 * `status` is also not rendered raw. `noShow` printed verbatim in a status
 * chip reads as a system error rather than a clinical fact.
 */
@Component({
  selector: 'app-appointment-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatCardModule, MatButtonModule, MatIconModule],
  templateUrl: './appointment-card.html',
  styleUrl: './appointment-card.scss',
})
export class AppointmentCard {
  readonly appointment = input.required<Appointment>();
  readonly locale = input('en-IN');
  /** Injected rather than read from the clock, so the join window is testable
   *  and the card can be rendered deterministically in a story. */
  readonly now = input<Date>(new Date());

  readonly join = output<Appointment>();
  /** Not `cancel`: that shadows the native DOM cancel event. */
  readonly cancelAppointment = output<Appointment>();
  readonly reschedule = output<Appointment>();
  readonly viewDetails = output<Appointment>();

  protected readonly statusLabel = computed(() => STATUS_LABELS[this.appointment().status]);
  protected readonly modeLabel = computed(() => MODE_LABELS[this.appointment().mode]);

  /** Drives styling and, more importantly, tone: a cancelled card should not
   *  look like an upcoming one. */
  protected readonly tone = computed<'upcoming' | 'live' | 'done' | 'cancelled'>(() => {
    switch (this.appointment().status) {
      case 'inProgress':
      case 'checkedIn':
        return 'live';
      case 'completed':
        return 'done';
      case 'cancelled':
      case 'noShow':
        return 'cancelled';
      default:
        return 'upcoming';
    }
  });

  protected readonly startsAt = computed(() => new Date(this.appointment().startsAt));

  protected readonly whenLabel = computed(() => {
    const start = this.startsAt();
    if (Number.isNaN(start.getTime())) return 'Time to be confirmed';

    const date = new Intl.DateTimeFormat(this.locale(), {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }).format(start);
    const time = new Intl.DateTimeFormat(this.locale(), {
      hour: 'numeric',
      minute: '2-digit',
    }).format(start);

    const end = this.appointment().endsAt;
    if (!end) return `${date}, ${time}`;

    const endTime = new Intl.DateTimeFormat(this.locale(), {
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(end));
    return `${date}, ${time} – ${endTime}`;
  });

  private readonly minutesUntilStart = computed(() => {
    const start = this.startsAt().getTime();
    if (Number.isNaN(start)) return Number.POSITIVE_INFINITY;
    return Math.round((start - this.now().getTime()) / 60_000);
  });

  /**
   * The room is open. Server-supplied `joinable` wins when present — only the
   * backend knows whether the clinician has actually started — and the time
   * window is the fallback.
   */
  protected readonly canJoin = computed(() => {
    const appointment = this.appointment();
    if (appointment.mode === 'inPerson') return false;
    if (this.tone() === 'cancelled' || this.tone() === 'done') return false;
    if (appointment.joinable !== undefined) return appointment.joinable;

    const minutes = this.minutesUntilStart();
    return minutes <= JOIN_WINDOW_MINUTES && minutes > -120;
  });

  /** Said out loud instead of showing a disabled button with no explanation. */
  protected readonly joinHint = computed(() => {
    if (this.canJoin()) return null;
    const appointment = this.appointment();
    if (appointment.mode === 'inPerson') return null;
    if (this.tone() === 'cancelled' || this.tone() === 'done') return null;

    const minutes = this.minutesUntilStart();
    if (minutes > 60 * 24) return 'You can join on the day of your appointment.';
    if (minutes > JOIN_WINDOW_MINUTES) {
      return `You can join ${JOIN_WINDOW_MINUTES} minutes before the start.`;
    }
    return null;
  });

  protected readonly canCancel = computed(
    () => this.appointment().cancellable !== false && this.tone() === 'upcoming',
  );

  protected readonly canReschedule = computed(
    () => this.appointment().reschedulable !== false && this.tone() === 'upcoming',
  );
}
