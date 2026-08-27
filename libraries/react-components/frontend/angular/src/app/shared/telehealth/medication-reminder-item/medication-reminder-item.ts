import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { DoseStatus, MedicationDose } from '../_core/telehealth.types';

const STATUS_WORDS: Readonly<Record<DoseStatus, string>> = {
  due: 'Due now',
  upcoming: 'Upcoming',
  taken: 'Taken',
  skipped: 'Skipped',
  missed: 'Missed',
  snoozed: 'Snoozed',
};

/**
 * One scheduled dose in a medication schedule.
 *
 * Benchmarks in ./README.md — Medisafe for the dose-card layout and pill image,
 * MyTherapy for adherence framing.
 *
 * The tone decision, which matters more here than the layout: **a missed dose is
 * reported, not scolded.** Adherence apps that shame produce patients who mark
 * doses taken to clear the badge, which is worse than an honest record. So a
 * missed dose is stated plainly with the action still available, the streak is
 * shown only when it exists, and nothing is coloured as failure.
 *
 * Marking taken is also not silently reversible-free: `undo` is offered because
 * the commonest error in these apps is tapping the wrong row.
 */
@Component({
  selector: 'app-medication-reminder-item',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './medication-reminder-item.html',
  styleUrl: './medication-reminder-item.scss',
  host: { '[attr.data-status]': 'dose().status' },
})
export class MedicationReminderItem {
  readonly dose = input.required<MedicationDose>();
  readonly locale = input('en-IN');
  readonly busy = input(false);

  readonly markTaken = output<MedicationDose>();
  readonly skip = output<MedicationDose>();
  readonly snooze = output<MedicationDose>();
  readonly undo = output<MedicationDose>();

  protected readonly statusWord = computed(() => STATUS_WORDS[this.dose().status]);

  protected readonly settled = computed(() => {
    const status = this.dose().status;
    return status === 'taken' || status === 'skipped';
  });

  protected readonly actionable = computed(() => {
    const status = this.dose().status;
    return status === 'due' || status === 'missed' || status === 'snoozed' || status === 'upcoming';
  });

  protected readonly timeLabel = computed(() => {
    const at = new Date(this.dose().scheduledAt);
    if (Number.isNaN(at.getTime())) return '';
    return new Intl.DateTimeFormat(this.locale(), {
      hour: 'numeric',
      minute: '2-digit',
    }).format(at);
  });

  protected readonly takenLabel = computed(() => {
    const takenAt = this.dose().takenAt;
    if (!takenAt) return null;
    const at = new Date(takenAt);
    if (Number.isNaN(at.getTime())) return null;
    return `Taken at ${new Intl.DateTimeFormat(this.locale(), { hour: 'numeric', minute: '2-digit' }).format(at)}`;
  });

  /** "Paracetamol 500 mg tablet" from three optional fields, without stray
   *  spaces when any of them is absent. */
  protected readonly fullName = computed(() => {
    const { medicationName, strength, form } = this.dose();
    return [medicationName, strength, form].filter(Boolean).join(' ');
  });

  /** Only shown once it is worth showing. A "1 day streak" is noise, and a
   *  streak of zero after a missed dose reads as a reprimand. */
  protected readonly streakLabel = computed(() => {
    const days = this.dose().streakDays ?? 0;
    return days >= 3 ? `${days}-day streak` : null;
  });

  protected readonly announcement = computed(() => {
    const parts = [this.fullName(), this.timeLabel(), this.statusWord()];
    const cautions = this.dose().cautions ?? [];
    if (cautions.length) parts.push(cautions.join('. '));
    return parts.filter(Boolean).join(', ');
  });
}
