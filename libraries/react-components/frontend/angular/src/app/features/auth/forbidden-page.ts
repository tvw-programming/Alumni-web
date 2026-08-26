import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { AuthStore } from '../../core/auth/auth-store';
import { logWarning } from '../../core/errors/error-logger';

/**
 * Shown when an authenticated user reaches a route their role does not permit.
 *
 * Distinct from a 404 on purpose: "this exists but is not yours" is different
 * information from "this does not exist", and conflating them makes a
 * permissions problem look like a broken link.
 */
@Component({
  selector: 'app-forbidden-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatIconModule, RouterLink],
  template: `
    <div class="forbidden">
      <mat-icon class="forbidden__icon" aria-hidden="true">lock_person</mat-icon>
      <h1>Not permitted</h1>
      <p>Your account does not have access to {{ from() ?? 'that page' }}.</p>
      <p class="forbidden__detail">
        Signed in as <strong>{{ auth.displayName() ?? 'unknown' }}</strong> with the
        <strong>{{ auth.role() ?? 'unknown' }}</strong> role. Ask an administrator if you need
        wider access.
      </p>
      <a matButton="filled" routerLink="/admin/dashboard">
        <mat-icon>home</mat-icon>
        Back to dashboard
      </a>
    </div>
  `,
  styles: `
    .forbidden {
      display: flex; flex-direction: column; align-items: center; gap: 12px;
      padding: 64px 16px; text-align: center;
    }
    .forbidden__icon { font-size: 56px; width: 56px; height: 56px; color: var(--mat-sys-tertiary); }
    .forbidden__detail { color: var(--mat-sys-on-surface-variant); font: var(--mat-sys-body-medium); }
  `,
})
export class ForbiddenPage {
  protected readonly auth = inject(AuthStore);
  private readonly route = inject(ActivatedRoute);

  /**
   * Read from the snapshot: the guard navigates here with `from` set once, and
   * the parameter cannot change while this page is displayed.
   */
  protected readonly from = signal(this.route.snapshot.queryParamMap.get('from'));

  constructor() {
    // A denial is worth recording: a legitimate user hitting this repeatedly
    // usually means their role is wrong, not that they are probing.
    const attempted = this.from();
    logWarning({
      channel: 'app',
      fileName: 'forbidden-page.ts',
      error: 'ACCESS_DENIED',
      errorDescription: `Role "${this.auth.role() ?? 'none'}" was denied ${attempted ?? 'a protected route'}.`,
      context: { kind: 'authorization', attempted, role: this.auth.role() },
    });
  }
}
