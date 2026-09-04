import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import { QuantityConfig } from '../_core/commerce.types';
import { QuantityStepper } from './quantity-stepper';

import samples from './quantity-stepper.sample.json';

/** Runnable gallery: every scenario in the sample JSON, plus a live one whose
 *  value actually changes so the announcements can be heard. */
@Component({
  selector: 'app-quantity-stepper-usage',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [QuantityStepper],
  template: `
    <section class="usage">
      <h2>QuantityStepper</h2>

      <article class="usage__case">
        <header><code>live</code><p>Controlled — the value below updates.</p></header>
        <app-quantity-stepper
          [config]="live()"
          itemName="Bananas"
          (valueChange)="setLive($event)"
          (limitReached)="lastMessage.set($event)"
        />
        <p class="usage__echo">value: {{ live().value }} · last limit: {{ lastMessage() || '—' }}</p>
      </article>

      @for (item of cases(); track item.key) {
        <article class="usage__case">
          <header><code>{{ item.key }}</code><p>{{ item.note }}</p></header>
          <app-quantity-stepper [config]="item.config" itemName="Bananas" />
        </article>
      }
    </section>
  `,
  styles: `
    .usage { display: flex; flex-direction: column; gap: 1rem; padding: 1.5rem; }
    .usage__case {
      display: grid; gap: 0.5rem; padding: 1rem;
      border: 1px solid var(--mat-sys-outline-variant); border-radius: 8px;
    }
    .usage__case code { font-weight: 600; }
    .usage__case p { margin: 0; color: var(--mat-sys-on-surface-variant); font-size: 0.875rem; }
    .usage__echo { font-variant-numeric: tabular-nums; }
  `,
})
export class QuantityStepperUsage {
  protected readonly live = signal<QuantityConfig>({ value: 1, min: 1, max: 4, step: 1 });
  protected readonly lastMessage = signal('');

  protected setLive(value: number): void {
    this.live.update((config) => ({ ...config, value }));
  }

  protected readonly cases = signal(
    Object.entries(samples as unknown as Record<string, Record<string, unknown>>)
      .filter(([key]) => !key.startsWith('$'))
      .map(([key, value]) => ({
        key,
        note: (value['$comment'] as string) ?? '',
        config: value as unknown as QuantityConfig,
      })),
  );
}
