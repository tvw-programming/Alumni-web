import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterLink } from '@angular/router';

import { logWarning } from '../../core/errors/error-logger';

/**
 * The 404 view.
 *
 * It logs, which is the point of having a real page here rather than a
 * placeholder: a route nobody can reach is usually a stale link or a typo in a
 * redirect, and the only way anyone finds out is if the miss is recorded. The
 * attempted URL is captured before the router has a chance to lose it.
 */
@Component({
  selector: 'app-not-found-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatIconModule, RouterLink],
  template: `
    <div class="not-found">
      <mat-icon class="not-found__icon" aria-hidden="true">explore_off</mat-icon>
      <h1 class="not-found__title">Page not found</h1>
      <p class="not-found__body">
        Nothing is routed to <code>{{ attempted() }}</code
        >. The link may be out of date.
      </p>
      <div class="not-found__actions">
        <a mat-flat-button routerLink="/">Go to the home page</a>
        <button mat-stroked-button type="button" (click)="goBack()">Go back</button>
      </div>
    </div>
  `,
  styles: `
    :host { display: block; }
    .not-found {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      max-width: 560px;
      margin: 96px auto;
      padding: 0 16px;
      text-align: center;
    }
    .not-found__icon {
      width: 56px;
      height: 56px;
      font-size: 56px;
      color: var(--mat-sys-on-surface-variant);
    }
    .not-found__title {
      margin: 0;
      font: var(--mat-sys-headline-medium);
      font-weight: 700;
    }
    .not-found__body {
      margin: 0;
      color: var(--mat-sys-on-surface-variant);
      /* A long bad URL must not push the page sideways. */
      overflow-wrap: anywhere;
    }
    .not-found__actions {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: 8px;
    }
  `,
})
export class NotFoundPage {
  private readonly router = inject(Router);

  protected readonly attempted = signal(this.router.url);

  constructor() {
    logWarning({
      channel: 'app',
      fileName: 'not-found-page.ts',
      error: 'ROUTE_NOT_FOUND',
      errorDescription: `No route matched ${this.router.url}`,
      context: { kind: 'routing', url: this.router.url },
    });
  }

  protected goBack(): void {
    // `history.back()` rather than a router call: the previous entry is the
    // page the user actually came from, which the router does not know.
    globalThis.history.back();
  }
}
