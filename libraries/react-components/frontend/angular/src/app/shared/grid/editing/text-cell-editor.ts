import { ChangeDetectionStrategy, Component } from '@angular/core';

import { InlineEditBase } from './inline-edit-base';
import { InlineEditorShell } from './inline-editor-shell';

import type { EditorType } from './editing.types';

/** In-cell text editor with declarative length validation. */
@Component({
  selector: 'app-text-cell-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [InlineEditorShell],
  template: `
    <app-inline-editor-shell
      [error]="errorText()"
      [saving]="saving()"
      [canApply]="canApply()"
      (apply)="apply()"
      (cancelled)="cancel()"
    >
      <input
        #field
        class="cell-input"
        type="text"
        [value]="draft()"
        [attr.aria-invalid]="validationError() !== null"
        [attr.aria-label]="params.column.getColDef().headerName ?? 'Value'"
        (input)="updateDraft($any($event.target).value)"
        (keydown)="onKeydown($event)"
      />
    </app-inline-editor-shell>
  `,
  styles: `
    .cell-input {
      width: 100%;
      border: 0;
      background: transparent;
      color: inherit;
      font: inherit;
      font-size: 0.875rem;
      outline: none;
    }
  `,
})
export class TextCellEditor<TData> extends InlineEditBase<TData, string> {
  protected readonly editorType: EditorType = 'text';
}
