import { ChangeDetectionStrategy, Component, computed, inject, input, model, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { isCloseBlocked, type PopupCloseBehavior, type PopupCloseReason } from './close-policy';

export type PopupMode = 'default' | 'warning' | 'destructive';

/**
 * Dialog shell rendered *inside* a `MatDialog`.
 *
 * Angular differs from React here in a way worth stating: React's `GenericPopup`
 * owns `open` and renders a portal itself. Angular's `MatDialog` service already
 * owns opening, the portal, the focus trap, focus restoration and `aria-modal`,
 * so this component is only the *content* — header, body slot, action footer —
 * and re-implementing the open/close plumbing would be duplicating the CDK.
 *
 * What is preserved from the React version is the part MatDialog does not
 * provide: the close **policy** (`close-policy.ts`), so a dirty or saving dialog
 * refuses to close and tells the parent why.
 *
 * ## Openers must pass `disableClose: true`
 *
 * MatDialog's own Escape and backdrop handling closes the dialog before this
 * component sees the event, which would let a dirty dialog vanish and silently
 * defeat the policy. `disableClose` hands both routes to this component, which
 * then applies the policy and closes — or refuses and reports why. Without it
 * the buttons would honour the policy and Escape would not, which is worse than
 * having no policy at all.
 */
@Component({
  selector: 'app-generic-popup',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <h2 mat-dialog-title class="popup__title" [class]="'popup__title--' + mode()">
      @if (icon()) {
        <mat-icon aria-hidden="true">{{ icon() }}</mat-icon>
      }
      <span>{{ title() }}</span>
      @if (showCloseButton()) {
        <button
          matIconButton
          class="popup__close"
          aria-label="Close dialog"
          (click)="attemptClose('close-button')"
        >
          <mat-icon>close</mat-icon>
        </button>
      }
    </h2>

    @if (description()) {
      <p class="popup__description">{{ description() }}</p>
    }

    <mat-dialog-content>
      <ng-content />
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      @if (!hideCancel()) {
        <button matButton [disabled]="loading()" (click)="attemptClose('cancel')">
          {{ cancelLabel() }}
        </button>
      }
      <button
        matButton="filled"
        [color]="confirmColor()"
        [disabled]="loading() || confirmDisabled()"
        (click)="confirm.emit()"
      >
        @if (loading()) {
          <mat-spinner diameter="16" />
          {{ loadingLabel() }}
        } @else {
          {{ confirmLabel() }}
        }
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .popup__title { display: flex; align-items: center; gap: 8px; }
    .popup__title--warning mat-icon { color: var(--mat-sys-tertiary); }
    .popup__title--destructive mat-icon { color: var(--mat-sys-error); }
    .popup__close { margin-left: auto; }
    .popup__description {
      margin: 0 24px 8px;
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-body-medium);
    }
    mat-dialog-actions { gap: 8px; }
  `,
})
export class GenericPopup {
  private readonly dialogRef = inject(MatDialogRef, { optional: true });

  readonly title = input('');
  readonly description = input<string>();
  readonly icon = input<string>();
  readonly mode = input<PopupMode>('default');

  readonly confirmLabel = input('Confirm');
  readonly cancelLabel = input('Cancel');
  readonly loadingLabel = input('Working…');
  readonly loading = input(false);
  readonly confirmDisabled = input(false);
  readonly hideCancel = input(false);
  readonly showCloseButton = input(true);

  /** Two-way: the parent can flip `dirty` as its form changes. */
  readonly closeBehavior = model<PopupCloseBehavior>({});

  readonly confirm = output();
  /** Emitted when the policy refused a close, so the parent can explain why. */
  readonly blockedClose = output<PopupCloseReason>();

  protected readonly confirmColor = computed(() =>
    this.mode() === 'destructive' ? 'warn' : this.mode() === 'warning' ? 'accent' : 'primary',
  );

  constructor() {
    // Escape and the backdrop are the two close routes with no button to hang a
    // handler on. With `disableClose: true` MatDialog forwards them here
    // instead of acting on them, which is what lets the policy cover every way
    // out of the dialog rather than only the ones with a button.
    //
    // Both are Observables from the CDK — a framework boundary, so subscribing
    // is correct here. `takeUntilDestroyed` ties them to this component's
    // lifetime.
    this.dialogRef
      ?.keydownEvents()
      .pipe(takeUntilDestroyed())
      .subscribe((event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          this.attemptClose('escape');
        }
      });

    this.dialogRef
      ?.backdropClick()
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        this.attemptClose('backdrop');
      });
  }

  protected attemptClose(reason: PopupCloseReason): void {
    if (isCloseBlocked(reason, this.closeBehavior(), this.loading())) {
      this.blockedClose.emit(reason);
      return;
    }
    this.dialogRef?.close(reason);
  }
}
