import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

import { GenericCard } from '../../shared/generic-card/generic-card';
import { SnackbarService } from '../../shared/snackbar/snackbar.service';
import { BackgroundJob } from './background-job';

/**
 * Manage Snackbar — every capability of the snackbar service, one button each.
 *
 * The last button is the interesting one: it fires from a service with no
 * component involved. React needed a module-level event bus for that; here the
 * service is injected, which is the whole reason the bus could be deleted.
 */
@Component({
  selector: 'app-snackbar-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GenericCard, MatButtonModule],
  template: `
    <app-generic-card
      title="Snackbar system"
      subtitle="Variants, actions, dismiss control, auto-hide, anchor position"
      icon="notifications"
    >
      <div class="snackbar-demo">
        <div class="snackbar-demo__row">
          <button mat-flat-button type="button" (click)="snackbar.success('Saved!')">
            Success
          </button>
          <button mat-flat-button type="button" (click)="snackbar.info('Heads up')">Info</button>
          <button mat-flat-button type="button" (click)="snackbar.warning('Careful…')">
            Warning
          </button>
          <button mat-flat-button type="button" (click)="snackbar.error('It broke')">Error</button>
        </div>

        <button mat-stroked-button type="button" (click)="withUndo()">
          With action button (Undo)
        </button>
        <button mat-stroked-button type="button" (click)="persistent()">
          Persistent (no auto-hide)
        </button>
        <button mat-stroked-button type="button" (click)="topCenter()">Top-centre anchor</button>
        <button mat-stroked-button type="button" (click)="noDismiss()">No dismiss button</button>
        <button mat-stroked-button type="button" (click)="fromService()">
          Programmatic (fires in 1.5s from a service)
        </button>
      </div>
    </app-generic-card>
  `,
  styles: `
    :host { display: block; padding: 16px 0; }
    .snackbar-demo {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;
      max-width: 640px;
    }
    .snackbar-demo__row {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
    }
  `,
})
export class SnackbarPage {
  protected readonly snackbar = inject(SnackbarService);
  private readonly job = inject(BackgroundJob);

  protected withUndo(): void {
    this.snackbar.warning('Item deleted', {
      action: { label: 'Undo', onClick: () => { this.snackbar.success('Item restored'); } },
    });
  }

  protected persistent(): void {
    this.snackbar.error('Persistent until dismissed', { duration: null });
  }

  protected topCenter(): void {
    this.snackbar.info('Anchored top-centre', {
      vertical: 'top',
      horizontal: 'center',
      duration: 3000,
    });
  }

  protected noDismiss(): void {
    this.snackbar.info('Not dismissible, hides in 2s', { dismissible: false, duration: 2000 });
  }

  protected fromService(): void {
    this.job.run();
  }
}
