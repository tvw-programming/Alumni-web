import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import type { ICellRendererAngularComp } from 'ag-grid-angular';
import type { ICellRendererParams } from 'ag-grid-community';

const STARS = [1, 2, 3, 4, 5];

/**
 * Read view for a rating column: five stars plus the numeric value, with the
 * same right-edge pencil trigger as `PencilEditRenderer`.
 *
 * The stars carry `aria-hidden`, because the number beside them already says
 * the same thing — announcing "star star star" before it would be noise.
 */
@Component({
  selector: 'app-star-rating-renderer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatIconModule, MatTooltipModule],
  template: `
    <span class="stars">
      <span class="stars__icons" aria-hidden="true">
        @for (star of allStars; track star) {
          <mat-icon class="stars__icon">{{ star <= value() ? 'star' : 'star_border' }}</mat-icon>
        }
      </span>
      <span class="stars__value">{{ value() ? value().toFixed(1) : '—' }}</span>
      <button
        matIconButton
        class="stars__button"
        type="button"
        matTooltip="Edit"
        [attr.aria-label]="'Edit ' + headerName()"
        (click)="startEditing()"
      >
        <mat-icon class="stars__edit-icon">edit</mat-icon>
      </button>
    </span>
  `,
  styles: `
    :host { display: block; height: 100%; }
    .stars {
      display: flex;
      align-items: center;
      gap: 6px;
      width: 100%;
      height: 100%;
    }
    .stars__icons { display: flex; color: var(--mat-sys-tertiary); }
    .stars__icon { font-size: 15px; width: 15px; height: 15px; }
    .stars__value { flex: 1 1 auto; font-variant-numeric: tabular-nums; }
    .stars__button {
      flex: 0 0 auto;
      width: 26px;
      height: 26px;
      padding: 0;
      opacity: 0;
      transition: opacity 120ms ease;
    }
    :host-context(.ag-row-hover) .stars__button,
    .stars__button:focus-visible {
      opacity: 1;
    }
    .stars__edit-icon { font-size: 16px; width: 16px; height: 16px; }
  `,
})
export class StarRatingRenderer<TData> implements ICellRendererAngularComp {
  private params!: ICellRendererParams<TData, number>;

  protected readonly allStars = STARS;
  protected readonly value = signal(0);
  protected readonly headerName = signal('rating');

  agInit(params: ICellRendererParams<TData, number>): void {
    this.update(params);
  }

  refresh(params: ICellRendererParams<TData, number>): boolean {
    this.update(params);
    return true;
  }

  private update(params: ICellRendererParams<TData, number>): void {
    this.params = params;
    this.value.set(typeof params.value === 'number' ? params.value : 0);
    this.headerName.set(params.column?.getColDef().headerName ?? 'rating');
  }

  protected startEditing(): void {
    const rowIndex = this.params.node.rowIndex;
    if (rowIndex === null || !this.params.column) return;
    this.params.api.startEditingCell({ rowIndex, colKey: this.params.column.getColId() });
  }
}
