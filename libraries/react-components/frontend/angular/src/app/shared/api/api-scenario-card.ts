import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { GenericCard } from '../generic-card/generic-card';

export type ApiScenarioStatus = 'idle' | 'pending' | 'success' | 'error';

/**
 * Presentational shell for one API demo: title, description, a run button and a
 * result or error panel. Every request stays in the page that owns it.
 *
 * Ported from React's `ApiScenarioCard`. The `secondaryAction` prop, which took
 * a `ReactNode`, is a projected slot here.
 */
@Component({
  selector: 'app-api-scenario-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GenericCard, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <app-generic-card [title]="title()" [subtitle]="description()" [icon]="icon()">
      <ng-content />

      @if (result()) {
        <p class="scenario__result">{{ result() }}</p>
      }
      @if (error()) {
        <p class="scenario__error" role="alert">{{ error() }}</p>
      }

      <div card-footer class="scenario__footer">
        @if (runnable()) {
          <button
            mat-flat-button
            type="button"
            [disabled]="status() === 'pending'"
            (click)="run.emit()"
          >
            @if (status() === 'pending') {
              <mat-spinner diameter="14" />
            } @else {
              <mat-icon>play_arrow</mat-icon>
            }
            {{ actionLabel() }}
          </button>
        }
        <ng-content select="[scenario-action]" />
        <span class="scenario__status" [class]="'scenario__status--' + status()">
          {{ status() }}
        </span>
      </div>
    </app-generic-card>
  `,
  styles: `
    :host { display: block; }
    .scenario__footer {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
    }
    .scenario__result, .scenario__error {
      margin: 8px 0 0;
      font: var(--mat-sys-body-medium);
      /* Results are API payloads: long, and not always breakable at spaces. */
      overflow-wrap: anywhere;
    }
    .scenario__result { color: var(--mat-sys-on-surface-variant); }
    .scenario__error { color: var(--mat-sys-error); }
    .scenario__status {
      margin-left: auto;
      padding: 2px 10px;
      border-radius: 999px;
      font: var(--mat-sys-label-small);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      background: var(--mat-sys-surface-container-highest);
      color: var(--mat-sys-on-surface-variant);
    }
    .scenario__status--success {
      background: var(--mat-sys-tertiary-container);
      color: var(--mat-sys-on-tertiary-container);
    }
    .scenario__status--error {
      background: var(--mat-sys-error-container);
      color: var(--mat-sys-on-error-container);
    }
  `,
})
export class ApiScenarioCard {
  readonly title = input.required<string>();
  readonly description = input('');
  readonly icon = input<string>();
  readonly status = input<ApiScenarioStatus>('idle');
  readonly result = input<string | null>(null);
  readonly error = input<string | null>(null);
  readonly actionLabel = input('Run example');
  /** False hides the run button, for scenarios driven only by their own controls. */
  readonly runnable = input(true);

  readonly run = output();
}
