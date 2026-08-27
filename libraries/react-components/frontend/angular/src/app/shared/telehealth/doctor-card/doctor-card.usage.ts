import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import { Doctor } from '../_core/telehealth.types';
import { DoctorCard, DoctorCardLayout } from './doctor-card';

import samples from './doctor-card.sample.json';

/**
 * Runnable gallery for `DoctorCard`.
 *
 * `nextAvailable` in the sample JSON is a fixed date, so "Today" only renders
 * as today on the day the fixture was written. The live toggle re-bases the
 * first card onto the current clock so the relative wording can be seen
 * working rather than taken on trust.
 */
@Component({
  selector: 'app-doctor-card-usage',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DoctorCard],
  template: `
    <section class="usage">
      <h2>DoctorCard</h2>

      <nav class="usage__tabs">
        @for (option of layouts; track option) {
          <button type="button" [class.is-active]="layout() === option" (click)="layout.set(option)">
            {{ option }}
          </button>
        }
        <button type="button" (click)="rebaseToNow()">Re-base times to now</button>
      </nav>

      @for (item of cases(); track item.key) {
        <article class="usage__case">
          <p class="usage__note"><code>{{ item.key }}</code> {{ item.note }}</p>
          <app-doctor-card
            [doctor]="item.doctor"
            [layout]="layout()"
            (book)="lastAction.set('book: ' + $event.displayName)"
            (viewProfile)="lastAction.set('profile: ' + $event.displayName)"
          />
        </article>
      }

      <p class="usage__echo">last action: {{ lastAction() || '—' }}</p>
    </section>
  `,
  styles: `
    .usage { display: flex; flex-direction: column; gap: 1rem; padding: 1.5rem; max-width: 52rem; }
    .usage__tabs { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .usage__tabs button {
      padding: 0.375rem 0.75rem; border-radius: 999px; cursor: pointer;
      border: 1px solid var(--mat-sys-outline-variant); background: none; color: inherit;
    }
    .usage__tabs button.is-active { background: var(--mat-sys-secondary-container); }
    .usage__case { display: grid; gap: 0.5rem; }
    .usage__note { margin: 0; font-size: 0.75rem; color: var(--mat-sys-on-surface-variant); }
    .usage__echo { font-size: 0.8125rem; color: var(--mat-sys-on-surface-variant); }
  `,
})
export class DoctorCardUsage {
  protected readonly layouts: readonly DoctorCardLayout[] = ['list', 'grid', 'compact'];
  protected readonly layout = signal<DoctorCardLayout>('list');
  protected readonly lastAction = signal('');

  protected readonly cases = signal(
    Object.entries(samples as unknown as Record<string, Record<string, unknown>>)
      .filter(([key]) => !key.startsWith('$'))
      .map(([key, value]) => ({
        key,
        note: (value['$comment'] as string) ?? '',
        doctor: value as unknown as Doctor,
      })),
  );

  /** Shifts every published slot onto today/tomorrow so the relative labels
   *  are demonstrable rather than frozen at the fixture's authoring date. */
  protected rebaseToNow(): void {
    const now = Date.now();
    this.cases.update((cases) =>
      cases.map((item, index) => {
        if (!item.doctor.nextAvailable) return item;
        const shifted = new Date(now + index * 20 * 60 * 60 * 1000).toISOString();
        return { ...item, doctor: { ...item.doctor, nextAvailable: shifted } };
      }),
    );
  }
}
