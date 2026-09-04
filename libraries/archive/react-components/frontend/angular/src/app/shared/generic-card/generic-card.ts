import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

export type CardSurface = 'default' | 'subtle' | 'accent';
export type CardSize = 'compact' | 'regular' | 'expanded';

/**
 * Presentational card shell with built-in loading / error / empty states.
 *
 * Ported from the React `GenericCard`. Two things changed shape:
 *
 * - **Slots** become `<ng-content select="[card-*]">` projections instead of a
 *   `slots` prop. Angular projects real DOM, so a caller writes markup rather
 *   than passing elements as values.
 * - **Grouped config objects** become individual signal `input()`s. The React
 *   API grouped them to avoid a 30-prop signature, but that grouping is what
 *   defeated `React.memo` there. Angular has no such penalty: signal inputs are
 *   compared individually, so flat inputs are both simpler and faster here.
 *
 * State priority is unchanged and still decided in one place: loading → error →
 * empty → content.
 */
@Component({
  selector: 'app-generic-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatCardModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './generic-card.html',
  styleUrl: './generic-card.scss',
})
export class GenericCard {
  readonly title = input<string>();
  readonly subtitle = input<string>();
  readonly icon = input<string>();
  readonly metric = input<string>();

  readonly loading = input(false);
  readonly error = input<string | null>(null);
  readonly empty = input(false);
  readonly emptyMessage = input('Nothing here yet');
  readonly emptyIcon = input('inbox');
  readonly errorTitle = input('Unable to load');
  readonly retryLabel = input('Retry');
  /** Emitted by the retry button. Absent handler means no button is rendered. */
  readonly retry = output();
  readonly showRetry = input(false);

  readonly surface = input<CardSurface>('default');
  readonly size = input<CardSize>('regular');
  readonly disabled = input(false);

  /**
   * The single place state precedence is decided, so every card in the app
   * behaves identically and two states can never render at once.
   */
  protected readonly state = computed<'loading' | 'error' | 'empty' | 'content'>(() => {
    if (this.loading()) return 'loading';
    if (this.error() !== null) return 'error';
    if (this.empty()) return 'empty';
    return 'content';
  });

  protected readonly hasHeader = computed(
    () => !!this.title() || !!this.subtitle() || !!this.icon(),
  );
}
