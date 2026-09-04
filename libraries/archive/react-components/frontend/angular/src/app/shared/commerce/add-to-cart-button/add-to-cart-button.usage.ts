import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import { AddToCartState } from '../_core/commerce.types';
import { AddToCartButton } from './add-to-cart-button';

import samples from './add-to-cart-button.sample.json';

/** Gallery plus a live button that walks idle → loading → added, so the
 *  announcements and the stable width can be observed rather than described. */
@Component({
  selector: 'app-add-to-cart-button-usage',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AddToCartButton],
  template: `
    <section class="usage">
      <h2>AddToCartButton</h2>

      <article class="usage__case">
        <header><code>live</code><p>Click it: idle → loading → added.</p></header>
        <app-add-to-cart-button
          [state]="liveState()"
          productTitle="Nike Air Max 90"
          (add)="simulateAdd()"
          (viewCart)="liveState.set('idle')"
        />
      </article>

      @for (item of cases(); track item.key) {
        <article class="usage__case">
          <header><code>{{ item.key }}</code><p>{{ item.note }}</p></header>
          <app-add-to-cart-button [state]="item.state" [productTitle]="item.title" />
        </article>
      }
    </section>
  `,
  styles: `
    .usage { display: flex; flex-direction: column; gap: 1rem; padding: 1.5rem; max-width: 32rem; }
    .usage__case {
      display: grid; gap: 0.5rem; padding: 1rem;
      border: 1px solid var(--mat-sys-outline-variant); border-radius: 8px;
    }
    .usage__case code { font-weight: 600; }
    .usage__case p { margin: 0; color: var(--mat-sys-on-surface-variant); font-size: 0.875rem; }
  `,
})
export class AddToCartButtonUsage {
  protected readonly liveState = signal<AddToCartState>('idle');

  /** Stands in for the cart service: the button only ever reflects what it is
   *  told, which is the point being demonstrated. */
  protected simulateAdd(): void {
    this.liveState.set('loading');
    setTimeout(() => this.liveState.set('added'), 900);
  }

  protected readonly cases = signal(
    Object.entries(samples as unknown as Record<string, Record<string, unknown>>)
      .filter(([key]) => !key.startsWith('$'))
      .map(([key, value]) => ({
        key,
        note: (value['$comment'] as string) ?? '',
        state: value['state'] as AddToCartState,
        title: value['productTitle'] as string,
      })),
  );
}
