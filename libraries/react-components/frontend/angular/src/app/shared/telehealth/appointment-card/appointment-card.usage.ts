import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import { Appointment } from '../_core/telehealth.types';
import { AppointmentCard } from './appointment-card';

import samples from './appointment-card.sample.json';

interface Case {
  readonly key: string;
  readonly note: string;
  readonly appointment: Appointment;
  readonly now: Date;
}

/**
 * Gallery. Each case renders against its own fixed `now`, which is what makes
 * the join-window behaviour visible: the same appointment shows Join or an
 * explanation depending only on the clock it is given.
 */
@Component({
  selector: 'app-appointment-card-usage',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppointmentCard],
  template: `
    <section class="usage">
      <h2>AppointmentCard</h2>
      @for (item of cases(); track item.key) {
        <article class="usage__case">
          <p class="usage__note">
            <code>{{ item.key }}</code>
            <span class="usage__clock">rendered at {{ item.now.toISOString() }}</span>
            {{ item.note }}
          </p>
          <app-appointment-card
            [appointment]="item.appointment"
            [now]="item.now"
            (join)="lastAction.set('join ' + $event.id)"
            (cancelAppointment)="lastAction.set('cancel ' + $event.id)"
            (reschedule)="lastAction.set('reschedule ' + $event.id)"
            (viewDetails)="lastAction.set('details ' + $event.id)"
          />
        </article>
      }
      <p class="usage__echo">last action: {{ lastAction() || '—' }}</p>
    </section>
  `,
  styles: `
    .usage { display: flex; flex-direction: column; gap: 1rem; padding: 1.5rem; max-width: 46rem; }
    .usage__case { display: grid; gap: 0.5rem; }
    .usage__note { margin: 0; font-size: 0.75rem; color: var(--mat-sys-on-surface-variant); }
    .usage__note code { font-weight: 600; margin-right: 0.5rem; }
    .usage__clock { margin-right: 0.5rem; font-variant-numeric: tabular-nums; }
    .usage__echo { font-size: 0.8125rem; }
  `,
})
export class AppointmentCardUsage {
  protected readonly lastAction = signal('');

  protected readonly cases = signal<readonly Case[]>(
    Object.entries(samples as unknown as Record<string, Record<string, unknown>>)
      .filter(([key]) => !key.startsWith('$'))
      .map(([key, value]) => ({
        key,
        note: (value['$comment'] as string) ?? '',
        appointment: value['appointment'] as Appointment,
        now: new Date(value['now'] as string),
      })),
  );
}
