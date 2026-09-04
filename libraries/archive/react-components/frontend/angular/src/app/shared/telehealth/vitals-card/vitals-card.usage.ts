import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import { Vital } from '../_core/telehealth.types';
import { VitalsCard } from './vitals-card';

import samples from './vitals-card.sample.json';

/** Gallery in a responsive grid — vitals are read as a set, so the tiles are
 *  shown the way a dashboard would arrange them. */
@Component({
  selector: 'app-vitals-card-usage',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [VitalsCard],
  template: `
    <section class="usage">
      <h2>VitalsCard</h2>
      <div class="usage__grid">
        @for (item of cases(); track item.key) {
          <div class="usage__cell">
            <p class="usage__note"><code>{{ item.key }}</code> {{ item.note }}</p>
            <app-vitals-card [vital]="item.vital" (openHistory)="lastAction.set($event.label)" />
          </div>
        }
      </div>
      <p class="usage__echo">opened history for: {{ lastAction() || '—' }}</p>
    </section>
  `,
  styles: `
    .usage { display: flex; flex-direction: column; gap: 1rem; padding: 1.5rem; }
    .usage__grid { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fill, minmax(13rem, 1fr)); }
    .usage__cell { display: flex; flex-direction: column; gap: 0.375rem; }
    .usage__note { margin: 0; font-size: 0.6875rem; color: var(--mat-sys-on-surface-variant); }
    .usage__note code { font-weight: 600; }
    .usage__echo { font-size: 0.8125rem; }
  `,
})
export class VitalsCardUsage {
  protected readonly lastAction = signal('');

  protected readonly cases = signal(
    Object.entries(samples as unknown as Record<string, Record<string, unknown>>)
      .filter(([key]) => !key.startsWith('$'))
      .map(([key, value]) => ({
        key,
        note: (value['$comment'] as string) ?? '',
        vital: value as unknown as Vital,
      })),
  );
}
