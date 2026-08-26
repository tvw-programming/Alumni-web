import { Injectable, inject } from '@angular/core';

import { SnackbarService } from '../../shared/snackbar/snackbar.service';

/**
 * Stands in for work that finishes away from any component — a poll, an upload,
 * a websocket message.
 *
 * The React app needed a module-level `snackbar` singleton so plain TypeScript
 * could raise a toast. This service is the Angular answer: it has an injector,
 * so it just injects the real thing. That is the entire reason the event bus
 * did not need porting.
 */
@Injectable({ providedIn: 'root' })
export class BackgroundJob {
  private readonly snackbar = inject(SnackbarService);

  run(): void {
    setTimeout(() => {
      this.snackbar.success('Background job finished', {
        action: { label: 'View log', onClick: () => { this.snackbar.info('Log opened'); } },
      });
    }, 1500);
  }
}
