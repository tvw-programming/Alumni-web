import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Standard page frame: constrained width, a title/subtitle block and an
 * optional action slot on the right.
 *
 * Ported from React's `PageContainer`. There it took `action` as a `ReactNode`
 * prop; here it is a content slot, which is the Angular-idiomatic equivalent and
 * avoids the caller having to construct a component to pass a button.
 */
@Component({
  selector: 'app-page-container',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page__header">
      <div class="page__heading">
        <h1 class="page__title">{{ title() }}</h1>
        @if (subtitle()) {
          <p class="page__subtitle">{{ subtitle() }}</p>
        }
      </div>
      <div class="page__action">
        <ng-content select="[page-action]" />
      </div>
    </header>
    <ng-content />
  `,
  styles: `
    :host {
      display: block;
      width: 100%;
      max-width: 1200px;
      margin-inline: auto;
      padding: 24px 16px 48px;
    }
    .page__header {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 32px;
    }
    .page__heading { min-width: 0; }
    .page__title {
      margin: 0;
      font: var(--mat-sys-headline-large);
      font-weight: 700;
    }
    .page__subtitle {
      margin: 8px 0 0;
      max-width: 68ch;
      font: var(--mat-sys-body-large);
      color: var(--mat-sys-on-surface-variant);
    }
    /* Empty when nothing is projected, so it must not add gap of its own. */
    .page__action:empty { display: none; }
  `,
})
export class PageContainer {
  readonly title = input.required<string>();
  readonly subtitle = input<string>();
}
