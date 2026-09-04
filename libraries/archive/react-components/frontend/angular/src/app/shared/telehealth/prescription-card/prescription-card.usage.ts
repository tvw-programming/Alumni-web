import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import { Prescription } from '../_core/telehealth.types';
import { PrescriptionCard } from './prescription-card';

import samples from './prescription-card.sample.json';

interface Case {
  readonly key: string;
  readonly note: string;
  readonly prescription: Prescription;
  readonly now: Date;
}

/** Gallery. Each case carries its own `now`, because "expires in 4 days" is
 *  meaningless without the clock it was computed against. */
@Component({
  selector: 'app-prescription-card-usage',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrescriptionCard],
  template: `
    <section class="usage">
      <h2>PrescriptionCard</h2>
      @for (item of cases(); track item.key) {
        <article class="usage__case">
          <p class="usage__note"><code>{{ item.key }}</code> {{ item.note }}</p>
          <app-prescription-card
            [prescription]="item.prescription"
            [now]="item.now"
            (download)="lastAction.set('download ' + $event.id)"
            (requestRefill)="lastAction.set('refill ' + $event.id)"
            (viewDetails)="lastAction.set('details ' + $event.id)"
          />
        </article>
      }
      <p class="usage__echo">last action: {{ lastAction() || '—' }}</p>
    </section>
  `,
  styles: `
    .usage { display: flex; flex-direction: column; gap: 1rem; padding: 1.5rem; max-width: 40rem; }
    .usage__case { display: grid; gap: 0.5rem; }
    .usage__note { margin: 0; font-size: 0.75rem; color: var(--mat-sys-on-surface-variant); }
    .usage__note code { font-weight: 600; margin-right: 0.5rem; }
    .usage__echo { font-size: 0.8125rem; }
  `,
})
export class PrescriptionCardUsage {
  protected readonly lastAction = signal('');

  protected readonly cases = signal<readonly Case[]>(
    Object.entries(samples as unknown as Record<string, Record<string, unknown>>)
      .filter(([key]) => !key.startsWith('$'))
      .map(([key, value]) => ({
        key,
        note: (value['$comment'] as string) ?? '',
        prescription: value['prescription'] as Prescription,
        now: new Date(value['now'] as string),
      })),
  );
}
