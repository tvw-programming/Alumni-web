import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';

import { DemoDialog } from './demo-dialog';
import { GenericCard } from '../../shared/generic-card/generic-card';
import { SnackbarService } from '../../shared/snackbar/snackbar.service';

import type { DemoDialogData } from './demo-dialog';

/**
 * Generic Popup showcase.
 *
 * MatDialog covers the mechanics React had to hand-roll — focus trapping,
 * scroll blocking, the backdrop, restoring focus on close. What the shared
 * component still owns is the **close policy**: whether a dirty or in-flight
 * dialog is allowed to close, and what the parent is told when it is not. That
 * is what the checkboxes here exercise.
 */
@Component({
  selector: 'app-generic-popup-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GenericCard, MatButtonModule, MatCheckboxModule],
  template: `
    <div class="popups">
      <app-generic-card
        title="Close policy"
        subtitle="Which closes are refused, and why"
        icon="rule"
      >
        <div class="popups__options">
          <mat-checkbox [checked]="dirty()" (change)="dirty.set($any($event).checked)">
            Dialog has unsaved changes
          </mat-checkbox>
          <mat-checkbox [checked]="busy()" (change)="busy.set($any($event).checked)">
            Dialog is saving
          </mat-checkbox>
        </div>
        <p class="popups__note">
          With either box ticked, every close route — backdrop, Escape, the close button and Cancel
          — is refused and reports why instead. Only Confirm still closes the dialog. Refusing
          Cancel too is deliberate: a dialog that blocks the accidental exits but not the obvious
          one is not actually protecting anything.
        </p>
      </app-generic-card>

      <app-generic-card title="Variants" subtitle="Default, warning, destructive" icon="web_asset">
        <div class="popups__buttons">
          <button mat-flat-button type="button" (click)="open('default')">Default dialog</button>
          <button mat-stroked-button type="button" (click)="open('warning')">Warning dialog</button>
          <button mat-stroked-button type="button" (click)="open('destructive')">
            Destructive dialog
          </button>
        </div>
        @if (lastResult()) {
          <p class="popups__result" role="status">Last close: {{ lastResult() }}</p>
        }
      </app-generic-card>
    </div>
  `,
  styles: `
    :host { display: block; padding: 16px 0; }
    .popups {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 24px;
      align-items: start;
    }
    .popups__options {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;
      margin-bottom: 12px;
    }
    .popups__buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
    }
    .popups__note, .popups__result {
      margin: 12px 0 0;
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-body-medium);
    }
  `,
})
export class GenericPopupPage {
  private readonly dialog = inject(MatDialog);
  private readonly snackbar = inject(SnackbarService);

  protected readonly dirty = signal(false);
  protected readonly busy = signal(false);
  protected readonly lastResult = signal<string | null>(null);

  protected async open(mode: DemoDialogData['mode']): Promise<void> {
    const data: DemoDialogData = {
      mode,
      dirty: this.dirty(),
      loading: this.busy(),
    };

    // Typed on `open`, not at the await: `MatDialogRef`'s result parameter is
    // what makes `afterClosed()` something other than `any`.
    const ref = this.dialog.open<DemoDialog, DemoDialogData, string | undefined>(DemoDialog, {
      data,
      width: '480px',
      // The policy lives in the component, so MatDialog's own shortcuts are
      // disabled and every close is routed through `attemptClose`.
      disableClose: true,
    });

    // `afterClosed()` emits once. `firstValueFrom` is the sanctioned way to
    // consume a one-shot Observable — feature code does not subscribe.
    const reason = await firstValueFrom(ref.afterClosed());
    this.lastResult.set(reason ?? 'dismissed');
    if (reason === 'confirm') this.snackbar.success('Confirmed');
  }

  protected onBlocked(reason: string): void {
    this.snackbar.warning(`Close refused (${reason})`);
  }
}
