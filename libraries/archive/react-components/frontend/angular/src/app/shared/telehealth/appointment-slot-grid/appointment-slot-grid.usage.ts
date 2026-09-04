import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import { AppointmentSlot, SlotDay, SlotId } from '../_core/telehealth.types';
import { AppointmentSlotGrid } from './appointment-slot-grid';

import samples from './appointment-slot-grid.sample.json';

/** Gallery: every dataset from the sample JSON, plus the loading state, with a
 *  live selection so the radio-group keyboard behaviour can be tried. */
@Component({
  selector: 'app-appointment-slot-grid-usage',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppointmentSlotGrid],
  template: `
    <section class="usage">
      <h2>AppointmentSlotGrid</h2>
      <p class="usage__hint">
        Tab once into the group, then use the arrow keys — the whole picker is a single tab stop.
      </p>

      <article class="usage__case">
        <p class="usage__note"><code>loading</code> skeleton preserves column geometry</p>
        <app-appointment-slot-grid [days]="[]" [loading]="true" />
      </article>

      @for (item of cases(); track item.key) {
        <article class="usage__case">
          <p class="usage__note"><code>{{ item.key }}</code></p>
          <app-appointment-slot-grid
            [days]="item.days"
            [selectedSlotId]="selected()"
            (selectSlot)="choose($event)"
            (requestMoreDays)="lastAction.set('requested later dates')"
          />
        </article>
      }

      <p class="usage__echo">selected: {{ selectedLabel() || '—' }} · {{ lastAction() }}</p>
    </section>
  `,
  styles: `
    .usage { display: flex; flex-direction: column; gap: 1.5rem; padding: 1.5rem; }
    .usage__hint { margin: 0; font-size: 0.8125rem; color: var(--mat-sys-on-surface-variant); }
    .usage__case { display: grid; gap: 0.5rem; }
    .usage__note { margin: 0; font-size: 0.75rem; color: var(--mat-sys-on-surface-variant); }
    .usage__echo { font-size: 0.8125rem; }
  `,
})
export class AppointmentSlotGridUsage {
  protected readonly selected = signal<SlotId | null>(null);
  protected readonly selectedLabel = signal('');
  protected readonly lastAction = signal('');

  protected choose(slot: AppointmentSlot): void {
    this.selected.set(slot.id);
    this.selectedLabel.set(new Date(slot.startsAt).toLocaleString());
  }

  protected readonly cases = signal(
    Object.entries(samples as unknown as Record<string, unknown>)
      .filter(([key]) => !key.startsWith('$'))
      .map(([key, value]) => ({ key, days: value as readonly SlotDay[] })),
  );
}
