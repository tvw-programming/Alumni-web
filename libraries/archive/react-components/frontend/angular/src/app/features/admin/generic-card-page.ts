import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';

import { GenericCard } from '../../shared/generic-card/generic-card';
import { SnackbarService } from '../../shared/snackbar/snackbar.service';

type DemoState = 'content' | 'loading' | 'error' | 'empty';

/**
 * Generic Card showcase.
 *
 * The point of the page is the state machine: a card is in exactly one of
 * loading / error / empty / content, decided in one place inside the component.
 * The toggle here drives real inputs, so what you see is the component's own
 * precedence rather than a mock-up of it.
 */
@Component({
  selector: 'app-generic-card-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GenericCard, MatButtonModule, MatButtonToggleModule, MatIconModule],
  template: `
    <div class="cards">
      <section class="cards__controls">
        <h2 class="cards__heading">State</h2>
        <mat-button-toggle-group
          [value]="state()"
          (change)="state.set($any($event).value)"
          aria-label="Card state"
          hideSingleSelectionIndicator
        >
          @for (option of states; track option) {
            <mat-button-toggle [value]="option">{{ option }}</mat-button-toggle>
          }
        </mat-button-toggle-group>
        <p class="cards__note">
          Every card below receives the same state, so their precedence rules can be compared
          directly.
        </p>
      </section>

      <div class="cards__grid">
        <app-generic-card
          title="Revenue"
          subtitle="Last 30 days"
          icon="payments"
          metric="$48,290"
          [loading]="isLoading()"
          [error]="errorText()"
          [empty]="isEmpty()"
          [showRetry]="true"
          (retry)="onRetry()"
        >
          <p class="cards__body">
            A metric card: the headline value sits in the header, the detail in the body.
          </p>
        </app-generic-card>

        <app-generic-card
          title="Quick note"
          subtitle="With a footer action"
          icon="sticky_note_2"
          surface="subtle"
          [loading]="isLoading()"
          [error]="errorText()"
          [empty]="isEmpty()"
        >
          <p class="cards__body">
            Footer content is a projected slot, so the card never has to know what the action does.
          </p>
          <div card-footer>
            <button mat-button type="button" (click)="snackbar.info('Footer action fired')">
              Take action
            </button>
          </div>
        </app-generic-card>

        <app-generic-card
          title="Header action"
          subtitle="Icon button, top right"
          icon="tune"
          [loading]="isLoading()"
          [error]="errorText()"
          [empty]="isEmpty()"
          emptyMessage="No settings configured yet"
          emptyIcon="settings"
        >
          <div card-header-action>
            <button matIconButton aria-label="Refresh panel" (click)="snackbar.info('Refreshed')">
              <mat-icon>refresh</mat-icon>
            </button>
          </div>
          <p class="cards__body">
            This one overrides the empty state's message and icon — switch the toggle to "empty" to
            see it.
          </p>
        </app-generic-card>

        <app-generic-card
          title="Compact"
          icon="crop_free"
          size="compact"
          surface="accent"
          [loading]="isLoading()"
          [error]="errorText()"
          [empty]="isEmpty()"
        >
          <p class="cards__body">Denser padding for a card that sits in a sidebar or a grid cell.</p>
        </app-generic-card>
      </div>
    </div>
  `,
  styles: `
    :host { display: block; padding: 16px 0; }
    .cards { display: flex; flex-direction: column; gap: 24px; }
    .cards__controls {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;
    }
    .cards__heading {
      margin: 0;
      font: var(--mat-sys-title-medium);
      font-weight: 600;
    }
    .cards__note, .cards__body {
      margin: 0;
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-body-medium);
    }
    .cards__grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 24px;
      align-items: start;
    }
  `,
})
export class GenericCardPage {
  protected readonly snackbar = inject(SnackbarService);

  protected readonly states: DemoState[] = ['content', 'loading', 'error', 'empty'];
  protected readonly state = signal<DemoState>('content');

  protected readonly isLoading = computed(() => this.state() === 'loading');
  protected readonly isEmpty = computed(() => this.state() === 'empty');
  protected readonly errorText = computed(() =>
    this.state() === 'error' ? 'The service did not respond in time.' : null,
  );

  protected onRetry(): void {
    this.state.set('content');
    this.snackbar.success('Retried — back to content');
  }
}
