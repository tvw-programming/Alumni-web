import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

import { InlineEditBase } from './inline-edit-base';
import { InlineEditorShell } from './inline-editor-shell';

import type { EditorType } from './editing.types';

const STARS = [1, 2, 3, 4, 5];

/**
 * Star-picker editor. The stars are real buttons, so the control is reachable
 * and operable by keyboard rather than being a mouse-only widget.
 */
@Component({
  selector: 'app-rating-cell-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [InlineEditorShell, MatIconModule],
  template: `
    <app-inline-editor-shell
      [error]="errorText()"
      [saving]="saving()"
      [canApply]="canApply()"
      (apply)="apply()"
      (cancelled)="cancel()"
    >
      <div
        #field
        class="rating"
        role="group"
        tabindex="-1"
        [attr.aria-label]="params.column.getColDef().headerName ?? 'Rating'"
        (keydown)="onKeydown($event)"
      >
        @for (star of stars; track star) {
          <button
            type="button"
            class="rating__star"
            [attr.aria-label]="star + ' of 5'"
            [attr.aria-pressed]="star <= current()"
            (click)="updateDraft(star.toString())"
          >
            <mat-icon class="rating__icon">
              {{ star <= current() ? 'star' : 'star_border' }}
            </mat-icon>
          </button>
        }
      </div>
    </app-inline-editor-shell>
  `,
  styles: `
    .rating { display: flex; align-items: center; outline: none; }
    .rating__star {
      display: grid;
      place-items: center;
      padding: 0;
      border: 0;
      background: transparent;
      color: var(--mat-sys-tertiary);
      cursor: pointer;
    }
    .rating__icon { font-size: 16px; width: 16px; height: 16px; }
  `,
})
export class RatingCellEditor<TData> extends InlineEditBase<TData, number> {
  protected readonly editorType: EditorType = 'rating';
  protected readonly stars = STARS;

  /** The draft is a string, so it is compared as a number for the fill state. */
  protected current(): number {
    return Number(this.draft()) || 0;
  }

  protected override parseDraft(draft: string): unknown {
    return Number(draft);
  }
}
