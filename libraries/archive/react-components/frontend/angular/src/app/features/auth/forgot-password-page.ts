import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';
import { getUserMessage, normalizeError } from '../../core/errors/normalize-error';

import type { ForgotPasswordResult } from '../../core/auth/auth.types';

/**
 * Requests a password reset link.
 *
 * The confirmation is deliberately vague — "if that email is registered" — and
 * is shown for *every* submission. Saying "no account with that email" would
 * turn this form into a way to test which addresses are registered, which is
 * exactly what the API's identical responses are designed to prevent. Undoing
 * that in the UI would give the whole thing away.
 */
@Component({
  selector: 'app-forgot-password-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    RouterLink,
  ],
  template: `
    <div class="forgot">
      <mat-card appearance="outlined" class="forgot__card">
        <mat-card-header><mat-card-title>Reset your password</mat-card-title></mat-card-header>
        <mat-card-content>
          @if (result(); as sent) {
            <p class="forgot__sent" role="status">{{ sent.message }}</p>
            @if (sent.devResetUrl) {
              <!-- Development only: the API returns the link when no mail
                   server is configured, so the flow is testable end to end. -->
              <div class="forgot__dev">
                <p>Development mode — no email was sent. Use this link:</p>
                <a [href]="sent.devResetUrl" class="forgot__dev-link">{{ sent.devResetUrl }}</a>
              </div>
            }
            <a routerLink="/login" class="forgot__link">Back to sign in</a>
          } @else {
            <p class="forgot__lede">
              Enter your email and we’ll send a link to set a new password.
            </p>

            <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
              <mat-form-field appearance="outline" class="forgot__field">
                <mat-label>Email</mat-label>
                <input matInput type="email" formControlName="email" autocomplete="username" />
                @if (form.controls.email.touched && form.controls.email.invalid) {
                  <mat-error>Enter a valid email address</mat-error>
                }
              </mat-form-field>

              @if (error()) {
                <p class="forgot__error" role="alert">{{ error() }}</p>
              }

              <button matButton="filled" type="submit" [disabled]="busy()">
                @if (busy()) {
                  <mat-spinner diameter="16" />
                }
                {{ busy() ? 'Sending…' : 'Send reset link' }}
              </button>
            </form>
            <a routerLink="/login" class="forgot__link">Back to sign in</a>
          }
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: `
    .forgot { display: flex; justify-content: center; padding: 48px 16px; }
    .forgot__card { width: 400px; }
    .forgot__field { width: 100%; }
    .forgot__lede, .forgot__sent {
      margin: 0 0 16px;
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-body-medium);
    }
    .forgot__sent { color: var(--mat-sys-on-surface); }
    .forgot__dev {
      background: var(--mat-sys-secondary-container);
      color: var(--mat-sys-on-secondary-container);
      padding: 12px;
      border-radius: 8px;
      margin-bottom: 16px;
      font: var(--mat-sys-body-small);
    }
    .forgot__dev p { margin: 0 0 8px; }
    .forgot__dev-link { overflow-wrap: anywhere; color: inherit; }
    .forgot__error { color: var(--mat-sys-error); font: var(--mat-sys-body-small); margin: 0 0 12px; }
    .forgot__link { display: inline-block; margin-top: 16px; color: var(--mat-sys-primary); }
  `,
})
export class ForgotPasswordPage {
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly result = signal<ForgotPasswordResult | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    try {
      this.result.set(await this.auth.requestPasswordReset(this.form.getRawValue().email));
    } catch (caught) {
      this.error.set(getUserMessage(normalizeError(caught)));
    } finally {
      this.busy.set(false);
    }
  }
}
