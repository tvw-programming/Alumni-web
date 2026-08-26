import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';
import { SnackbarService } from '../../shared/snackbar/snackbar.service';
import { getUserMessage, normalizeError } from '../../core/errors/normalize-error';

/**
 * A length floor and nothing else, matching the API.
 *
 * Composition rules ("one uppercase, one symbol") mostly produce `Password1!`
 * and measurably weaken real-world choices. NIST SP 800-63B recommends exactly
 * this: require length, drop the character classes.
 */
const MIN_LENGTH = 12;

@Component({
  selector: 'app-reset-password-page',
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
    <div class="reset">
      <mat-card appearance="outlined" class="reset__card">
        <mat-card-header><mat-card-title>Choose a new password</mat-card-title></mat-card-header>
        <mat-card-content>
          @if (!token) {
            <!-- Say so here rather than letting the user type a password that
                 cannot be submitted. -->
            <p class="reset__error" role="alert">
              This reset link is missing its token. Request a new one.
            </p>
            <a routerLink="/forgot-password" class="reset__link">Request a new link</a>
          } @else {
            <p class="reset__lede">
              At least {{ minLength }} characters. A memorable phrase beats a short, complicated
              one.
            </p>

            <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
              <mat-form-field appearance="outline" class="reset__field">
                <mat-label>New password</mat-label>
                <input
                  matInput
                  type="password"
                  formControlName="password"
                  autocomplete="new-password"
                />
                @if (form.controls.password.touched && form.controls.password.invalid) {
                  <mat-error>At least {{ minLength }} characters</mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="outline" class="reset__field">
                <mat-label>Confirm new password</mat-label>
                <input
                  matInput
                  type="password"
                  formControlName="confirm"
                  autocomplete="new-password"
                />
              </mat-form-field>

              @if (error()) {
                <p class="reset__error" role="alert">{{ error() }}</p>
              }

              <button matButton="filled" type="submit" [disabled]="busy()">
                @if (busy()) {
                  <mat-spinner diameter="16" />
                }
                {{ busy() ? 'Updating…' : 'Set new password' }}
              </button>

              <p class="reset__note">Setting a new password signs you out everywhere else.</p>
            </form>
          }
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: `
    .reset { display: flex; justify-content: center; padding: 48px 16px; }
    .reset__card { width: 400px; }
    .reset__field { width: 100%; }
    .reset__lede, .reset__note {
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-body-small);
    }
    .reset__lede { margin: 0 0 16px; }
    .reset__note { margin: 12px 0 0; }
    .reset__error { color: var(--mat-sys-error); font: var(--mat-sys-body-small); margin: 0 0 12px; }
    .reset__link { color: var(--mat-sys-primary); }
  `,
})
export class ResetPasswordPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly snackbar = inject(SnackbarService);
  private readonly fb = inject(FormBuilder);

  protected readonly minLength = MIN_LENGTH;
  protected readonly token = this.route.snapshot.queryParamMap.get('token') ?? '';
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    password: ['', [Validators.required, Validators.minLength(MIN_LENGTH)]],
    confirm: [''],
  });

  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { password, confirm } = this.form.getRawValue();
    if (password !== confirm) {
      this.error.set('The two passwords do not match.');
      return;
    }

    this.busy.set(true);
    this.error.set(null);
    try {
      const message = await this.auth.resetPassword(this.token, password);
      this.snackbar.success(message);
      await this.router.navigateByUrl('/login', { replaceUrl: true });
    } catch (caught) {
      const normalized = normalizeError(caught);
      this.error.set(normalized.message || getUserMessage(normalized));
    } finally {
      this.busy.set(false);
    }
  }
}
