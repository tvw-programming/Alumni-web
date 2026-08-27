import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import { PriceModel } from '../_core/commerce.types';
import { PriceTag } from './price-tag';

import samples from './price-tag.sample.json';

interface Case {
  readonly key: string;
  readonly note: string;
  readonly price: PriceModel;
}

/**
 * Runnable gallery for `PriceTag` — one row per scenario in the sample JSON.
 *
 * This is the library's "story" surface: the brief asks every component to
 * carry default, empty, long-content and edge-case examples, and a demo built
 * from the same JSON a consumer copies means the examples cannot drift from the
 * documented shape.
 */
@Component({
  selector: 'app-price-tag-usage',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PriceTag],
  template: `
    <section class="usage">
      <h2>PriceTag</h2>
      @for (item of cases(); track item.key) {
        <article class="usage__case">
          <header>
            <code>{{ item.key }}</code>
            <p>{{ item.note }}</p>
          </header>
          <div class="usage__render">
            <app-price-tag [price]="item.price" size="lg" />
            <app-price-tag [price]="item.price" size="md" />
            <app-price-tag [price]="item.price" size="sm" />
          </div>
        </article>
      }
    </section>
  `,
  styles: `
    .usage { display: flex; flex-direction: column; gap: 1.5rem; padding: 1.5rem; }
    .usage__case {
      display: grid; gap: 0.75rem; padding: 1rem;
      border: 1px solid var(--mat-sys-outline-variant); border-radius: 8px;
    }
    .usage__case header { display: flex; flex-direction: column; gap: 0.25rem; }
    .usage__case code { font-weight: 600; }
    .usage__case p { margin: 0; color: var(--mat-sys-on-surface-variant); font-size: 0.875rem; }
    .usage__render { display: flex; flex-wrap: wrap; align-items: baseline; gap: 2rem; }
  `,
})
export class PriceTagUsage {
  /** Built from the JSON so the gallery and the documented samples cannot
   *  disagree. `$comment` keys are metadata, not scenarios. */
  protected readonly cases = signal<readonly Case[]>(
    Object.entries(samples as unknown as Record<string, Record<string, unknown>>)
      .filter(([key]) => !key.startsWith('$'))
      .map(([key, value]) => ({
        key,
        note: (value['$comment'] as string) ?? '',
        price: value as unknown as PriceModel,
      })),
  );
}
