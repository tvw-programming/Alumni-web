import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import { ProductCardData } from '../_core/commerce.types';
import { ProductCard, ProductCardLayout } from './product-card';

import samples from './product-card.sample.json';

/** Gallery across all three layouts, driven by the sample JSON. */
@Component({
  selector: 'app-product-card-usage',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ProductCard],
  template: `
    <section class="usage">
      <h2>ProductCard</h2>

      <nav class="usage__tabs">
        @for (option of layouts; track option) {
          <button type="button" [class.is-active]="layout() === option" (click)="layout.set(option)">
            {{ option }}
          </button>
        }
      </nav>

      <div class="usage__grid" [attr.data-layout]="layout()">
        @for (item of cases(); track item.key) {
          <div class="usage__cell">
            <p class="usage__note"><code>{{ item.key }}</code> {{ item.note }}</p>
            <app-product-card
              [product]="item.product"
              [layout]="layout()"
              [wishlisted]="wishlisted().has(item.product.id)"
              (toggleWishlist)="toggle($event)"
            />
          </div>
        }
      </div>
    </section>
  `,
  styles: `
    .usage { padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
    .usage__tabs { display: flex; gap: 0.5rem; }
    .usage__tabs button {
      padding: 0.375rem 0.75rem; border-radius: 999px; cursor: pointer;
      border: 1px solid var(--mat-sys-outline-variant); background: none; color: inherit;
    }
    .usage__tabs button.is-active { background: var(--mat-sys-secondary-container); }
    .usage__grid { display: grid; gap: 1rem; }
    .usage__grid[data-layout='grid'] { grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr)); }
    .usage__cell { display: flex; flex-direction: column; gap: 0.5rem; }
    .usage__note { margin: 0; font-size: 0.75rem; color: var(--mat-sys-on-surface-variant); }
  `,
})
export class ProductCardUsage {
  protected readonly layouts: readonly ProductCardLayout[] = ['grid', 'list', 'compact'];
  protected readonly layout = signal<ProductCardLayout>('grid');
  protected readonly wishlisted = signal(new Set<string>());

  protected toggle(id: string): void {
    this.wishlisted.update((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  protected readonly cases = signal(
    Object.entries(samples as unknown as Record<string, Record<string, unknown>>)
      .filter(([key]) => !key.startsWith('$'))
      .map(([key, value]) => ({
        key,
        note: (value['$comment'] as string) ?? '',
        product: value as unknown as ProductCardData,
      })),
  );
}
