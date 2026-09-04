import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import type { ICellRendererAngularComp } from 'ag-grid-angular';
import type { ICellRendererParams } from 'ag-grid-community';

/**
 * Read view for an inline-editable column: the formatted value, with a pencil
 * pinned to the right edge of the cell as the edit trigger.
 *
 * The pencil is invisible until the row is hovered or the button takes keyboard
 * focus, so the grid keeps a clean read view without the affordance becoming
 * mouse-only.
 */
@Component({
  selector: 'app-pencil-edit-renderer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatIconModule, MatTooltipModule],
  template: `
    <span class="pencil">
      <span class="pencil__value">{{ display() }}</span>
      <button
        matIconButton
        class="pencil__button"
        type="button"
        matTooltip="Edit"
        [attr.aria-label]="'Edit ' + headerName()"
        (click)="startEditing()"
      >
        <mat-icon class="pencil__icon">edit</mat-icon>
      </button>
    </span>
  `,
  styles: `
    :host { display: block; height: 100%; }
    .pencil {
      display: flex;
      align-items: center;
      gap: 4px;
      width: 100%;
      height: 100%;
    }
    .pencil__value {
      flex: 1 1 auto;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .pencil__button {
      flex: 0 0 auto;
      width: 26px;
      height: 26px;
      padding: 0;
      opacity: 0;
      transition: opacity 120ms ease;
    }
    /* Revealed on row hover, and on keyboard focus so it is not mouse-only. */
    :host-context(.ag-row-hover) .pencil__button,
    .pencil__button:focus-visible {
      opacity: 1;
    }
    .pencil__icon { font-size: 16px; width: 16px; height: 16px; }
  `,
})
export class PencilEditRenderer<TData> implements ICellRendererAngularComp {
  private params!: ICellRendererParams<TData>;

  protected readonly display = signal('');
  protected readonly headerName = signal('cell');

  agInit(params: ICellRendererParams<TData>): void {
    this.update(params);
  }

  /** AG Grid reuses renderer instances as rows scroll; `true` accepts the reuse. */
  refresh(params: ICellRendererParams<TData>): boolean {
    this.update(params);
    return true;
  }

  private update(params: ICellRendererParams<TData>): void {
    this.params = params;
    this.display.set(
      params.valueFormatted ??
        (params.value === null || params.value === undefined ? '' : String(params.value)),
    );
    this.headerName.set(params.column?.getColDef().headerName ?? 'cell');
  }

  protected startEditing(): void {
    const rowIndex = this.params.node.rowIndex;
    if (rowIndex === null || !this.params.column) return;
    this.params.api.startEditingCell({ rowIndex, colKey: this.params.column.getColId() });
  }
}
