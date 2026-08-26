import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { GenericPopup } from '../../shared/generic-popup/generic-popup';
import { SnackbarService } from '../../shared/snackbar/snackbar.service';

import type { PopupCloseReason } from '../../shared/generic-popup/close-policy';
import type { PopupMode } from '../../shared/generic-popup/generic-popup';

export interface DemoDialogData {
  mode: PopupMode;
  dirty: boolean;
  loading: boolean;
}

const COPY: Record<PopupMode, { title: string; description: string; confirm: string; icon: string }> =
  {
    default: {
      title: 'Save changes?',
      description: 'Your edits will be applied immediately.',
      confirm: 'Save',
      icon: 'save',
    },
    warning: {
      title: 'This will notify 42 people',
      description: 'Everyone on the distribution list receives an email.',
      confirm: 'Send anyway',
      icon: 'warning',
    },
    destructive: {
      title: 'Delete this record?',
      description: 'Deleting is permanent. There is no undo.',
      confirm: 'Delete',
      icon: 'delete_forever',
    },
  };

/**
 * The dialog body opened by the popup showcase.
 *
 * MatDialog instantiates a component rather than projecting a template, so the
 * content lives in its own file. `GenericPopup` supplies the chrome, the close
 * policy and the confirm/cancel actions; this component supplies only what is
 * specific to the demo.
 */
@Component({
  selector: 'app-demo-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GenericPopup],
  template: `
    <app-generic-popup
      [title]="copy.title"
      [description]="copy.description"
      [icon]="copy.icon"
      [mode]="data.mode"
      [confirmLabel]="copy.confirm"
      [loading]="data.loading"
      [(closeBehavior)]="closeBehavior"
      (confirm)="onConfirm()"
      (blockedClose)="onBlocked($event)"
    >
      <p class="demo-dialog__body">
        {{
          data.dirty
            ? 'This dialog reports unsaved changes, so the backdrop and Escape are refused.'
            : 'Nothing is unsaved, so every close route works normally.'
        }}
      </p>
    </app-generic-popup>
  `,
  styles: `.demo-dialog__body { margin: 0; color: var(--mat-sys-on-surface-variant); }`,
})
export class DemoDialog {
  protected readonly data = inject<DemoDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<DemoDialog>);
  private readonly snackbar = inject(SnackbarService);

  protected readonly copy = COPY[this.data.mode];

  /**
   * Seeded from the opener; a real dialog would flip `dirty` as its form
   * changes.
   *
   * `preventCloseWhenDirty` is the opt-in: `dirty` on its own is only a fact
   * about the dialog, and the policy deliberately makes refusing a separate
   * decision — plenty of dialogs want to track dirtiness without trapping the
   * user in it.
   */
  protected readonly closeBehavior = signal({
    dirty: this.data.dirty,
    preventCloseWhenDirty: true,
  });

  protected onConfirm(): void {
    this.dialogRef.close('confirm');
  }

  protected onBlocked(reason: PopupCloseReason): void {
    this.snackbar.warning(`Close refused (${reason}) — there are unsaved changes.`);
  }
}
