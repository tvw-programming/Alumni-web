import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import { MedicationDose } from '../_core/telehealth.types';
import { MedicationReminderItem } from './medication-reminder-item';

import samples from './medication-reminder-item.sample.json';

/**
 * Runnable schedule. Actions mutate local state so the taken → undo round trip
 * can be exercised, which is where the "wrong row" error actually happens.
 */
@Component({
  selector: 'app-medication-reminder-item-usage',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MedicationReminderItem],
  template: `
    <section class="usage">
      <h2>MedicationReminderItem</h2>
      <div class="usage__list">
        @for (dose of doses(); track dose.id) {
          <app-medication-reminder-item
            [dose]="dose"
            (markTaken)="record($event, 'taken')"
            (skip)="record($event, 'skipped')"
            (snooze)="record($event, 'snoozed')"
            (undo)="record($event, 'due')"
          />
        }
      </div>
      <p class="usage__echo">last change: {{ lastAction() || '—' }}</p>
    </section>
  `,
  styles: `
    .usage { display: flex; flex-direction: column; gap: 1rem; padding: 1.5rem; max-width: 44rem; }
    .usage__list { display: flex; flex-direction: column; gap: 0.625rem; container-type: inline-size; }
    .usage__echo { font-size: 0.8125rem; color: var(--mat-sys-on-surface-variant); }
  `,
})
export class MedicationReminderItemUsage {
  protected readonly lastAction = signal('');

  protected readonly doses = signal<readonly MedicationDose[]>(
    Object.entries(samples as unknown as Record<string, Record<string, unknown>>)
      .filter(([key]) => !key.startsWith('$'))
      .map(([, value]) => value as unknown as MedicationDose),
  );

  protected record(dose: MedicationDose, status: MedicationDose['status']): void {
    this.lastAction.set(`${dose.medicationName} → ${status}`);
    this.doses.update((list) =>
      list.map((d) =>
        d.id === dose.id
          ? {
              ...d,
              status,
              // Cleared on undo, so the row does not claim a time for a dose
              // that is no longer marked taken.
              takenAt: status === 'taken' ? new Date().toISOString() : undefined,
            }
          : d,
      ),
    );
  }
}
