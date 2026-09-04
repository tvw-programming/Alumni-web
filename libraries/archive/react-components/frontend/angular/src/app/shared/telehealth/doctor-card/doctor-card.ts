import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';

import { ConsultationMode, Doctor } from '../_core/telehealth.types';

export type DoctorCardLayout = 'list' | 'grid' | 'compact';

const MODE_ICONS: Readonly<Record<ConsultationMode, string>> = {
  video: 'videocam',
  audio: 'call',
  chat: 'chat_bubble_outline',
  inPerson: 'location_on',
};

const MODE_LABELS: Readonly<Record<ConsultationMode, string>> = {
  video: 'Video consult',
  audio: 'Audio consult',
  chat: 'Chat consult',
  inPerson: 'In-person visit',
};

/**
 * Clinician summary card — the unit of a search result list.
 *
 * Benchmarks in ./README.md. Practo and Zocdoc for the information order,
 * Doctolib for next-availability as the primary decision aid.
 *
 * The judgement this component encodes: **next availability outranks rating.**
 * A patient choosing a doctor is choosing a time first and a person second, and
 * every strong booking product surfaces "today, 4:30 pm" more prominently than
 * a star average.
 *
 * The card is not one link — same reasoning as the commerce `ProductCard`. The
 * name is the link; Book is a separate, separately-labelled control.
 */
@Component({
  selector: 'app-doctor-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatCardModule, MatButtonModule, MatIconModule, MatChipsModule],
  templateUrl: './doctor-card.html',
  styleUrl: './doctor-card.scss',
  host: { '[class]': '"doctor doctor--" + layout()' },
})
export class DoctorCard {
  readonly doctor = input.required<Doctor>();
  readonly layout = input<DoctorCardLayout>('list');
  readonly busy = input(false);
  readonly locale = input('en-IN');

  readonly book = output<Doctor>();
  readonly viewProfile = output<Doctor>();

  protected readonly specialtyLine = computed(() => this.doctor().specialties.join(' • '));

  protected readonly modes = computed(() =>
    this.doctor().modes.map((mode) => ({
      mode,
      icon: MODE_ICONS[mode],
      label: MODE_LABELS[mode],
    })),
  );

  protected readonly fee = computed(() => {
    const { consultationFeeMinor, currency } = this.doctor();
    if (consultationFeeMinor === undefined || !currency) return null;
    return new Intl.NumberFormat(this.locale(), {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(consultationFeeMinor / 100);
  });

  /**
   * "Today, 4:30 pm" rather than a raw timestamp. Relative-to-today wording is
   * what makes a list scannable; an ISO string makes the patient do the maths.
   */
  protected readonly nextAvailableLabel = computed(() => {
    const iso = this.doctor().nextAvailable;
    if (!iso) return null;

    const when = new Date(iso);
    if (Number.isNaN(when.getTime())) return null;

    const time = new Intl.DateTimeFormat(this.locale(), {
      hour: 'numeric',
      minute: '2-digit',
    }).format(when);

    const today = new Date();
    const days = Math.round(
      (this.startOfDay(when).getTime() - this.startOfDay(today).getTime()) / 86_400_000,
    );
    if (days <= 0) return `Today, ${time}`;
    if (days === 1) return `Tomorrow, ${time}`;
    return `${new Intl.DateTimeFormat(this.locale(), { weekday: 'short', day: 'numeric', month: 'short' }).format(when)}, ${time}`;
  });

  /** Availability today is the strongest signal in the list, so it is styled
   *  as a positive rather than as neutral metadata. */
  protected readonly availableToday = computed(() =>
    (this.nextAvailableLabel() ?? '').startsWith('Today'),
  );

  /** Name, specialty and availability in one string — what a screen-reader
   *  user needs before deciding to open the profile. */
  protected readonly profileLabel = computed(() => {
    const doctor = this.doctor();
    const parts = [doctor.displayName, this.specialtyLine()];
    const next = this.nextAvailableLabel();
    if (next) parts.push(`next available ${next}`);
    return parts.join(', ');
  });

  protected readonly bookLabel = computed(() => `Book appointment with ${this.doctor().displayName}`);

  private startOfDay(date: Date): Date {
    const copy = new Date(date);
    copy.setHours(0, 0, 0, 0);
    return copy;
  }
}
