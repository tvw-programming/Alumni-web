import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

/**
 * Shared chrome for every inline editor, rendered *inside* the cell rather than
 * in a popup: one compact row of input + Apply / Cancel, sized to the grid's
 * row height. Validation and save failures surface as a tooltip on the row.
 *
 * The editor's input is projected, so this component never knows which of the
 * four editor types it is wrapping.
 */
@Component({
  selector: 'app-inline-editor-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatTooltipModule],
  template: `
    <div
      class="inline-editor"
      [matTooltip]="error() ?? ''"
      [matTooltipDisabled]="error() === null"
      matTooltipPosition="above"
      [class.inline-editor--invalid]="error() !== null"
    >
      <div class="inline-editor__control">
        <ng-content />
      </div>

      <button
        matIconButton
        class="inline-editor__button"
        type="button"
        aria-label="Apply"
        matTooltip="Apply"
        [disabled]="!canApply()"
        (click)="apply.emit()"
      >
        @if (saving()) {
          <mat-spinner diameter="14" />
        } @else {
          <mat-icon class="inline-editor__icon">check</mat-icon>
        }
      </button>
      <button
        matIconButton
        class="inline-editor__button"
        type="button"
        aria-label="Cancel"
        matTooltip="Cancel"
        [disabled]="saving()"
        (click)="cancelled.emit()"
      >
        <mat-icon class="inline-editor__icon">close</mat-icon>
      </button>
    </div>
  `,
  styles: `
    :host { display: block; height: 100%; }
    .inline-editor {
      display: flex;
      align-items: center;
      gap: 2px;
      width: 100%;
      height: 100%;
      padding-inline: 6px;
      background: var(--mat-sys-surface-container-low);
      /* An inset ring marks the cell as being edited without changing layout. */
      box-shadow: inset 0 0 0 1.5px var(--mat-sys-primary);
    }
    .inline-editor--invalid { box-shadow: inset 0 0 0 1.5px var(--mat-sys-error); }
    .inline-editor__control { flex: 1 1 auto; min-width: 0; }
    .inline-editor__button {
      flex: 0 0 auto;
      width: 28px;
      height: 28px;
      padding: 0;
    }
    .inline-editor__icon { font-size: 16px; width: 16px; height: 16px; }
  `,
})
export class InlineEditorShell {
  readonly error = input<string | null>(null);
  readonly saving = input(false);
  readonly canApply = input(false);

  readonly apply = output();
  /** `cancelled`, not `cancel`: the latter is a native DOM event name. */
  readonly cancelled = output();
}
