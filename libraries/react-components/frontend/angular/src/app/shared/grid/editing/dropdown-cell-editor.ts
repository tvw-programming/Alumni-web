import { ChangeDetectionStrategy, Component } from '@angular/core';

import { InlineEditBase } from './inline-edit-base';
import { InlineEditorShell } from './inline-editor-shell';

import type { EditorType } from './editing.types';

/**
 * In-cell dropdown, from `editorOptions` or a shared list resolved via
 * `optionsKey`. A native `<select>` rather than `mat-select`: the Material
 * version renders an overlay panel, which fights AG Grid's in-cell editor and
 * its focus handling for no gain at this size.
 */
@Component({
  selector: 'app-dropdown-cell-editor',
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
      <select
        #field
        class="cell-select"
        [value]="draft()"
        [attr.aria-label]="params.column.getColDef().headerName ?? 'Value'"
        (change)="updateDraft($any($event.target).value)"
        (keydown)="onKeydown($event)"
      >
        @for (option of params.options ?? []; track option.value) {
          <option [value]="option.value">{{ option.label }}</option>
        }
      </select>
    </app-inline-editor-shell>
  `,
  styles: `
    .cell-select {
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
export class DropdownCellEditor<TData> extends InlineEditBase<TData, string> {
  protected readonly editorType: EditorType = 'dropdown';
}
