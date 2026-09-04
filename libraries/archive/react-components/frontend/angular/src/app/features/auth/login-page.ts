import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';
import { IS_DEV } from '../../core/config/app-config';
import { SnackbarService } from '../../shared/snackbar/snackbar.service';
import { getUserMessage, normalizeError } from '../../core/errors/normalize-error';

const DEFAULT_DESTINATION = '/admin/dashboard';

@Component({
  selector: 'app-login-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    RouterLink,
  ],
  template: `
    <div class="login">
      <mat-card appearance="outlined" class="login__card">
        <mat-card-header><mat-card-title>Sign in</mat-card-title></mat-card-header>
        <mat-card-content>
          @if (isDev) {
            <p class="login__hint">
              Seeded accounts: <strong>admin&#64;idol-promo.test</strong> and
              <strong>user&#64;idol-promo.test</strong>, password <strong>Password123!</strong>
            </p>
          }

          <!-- novalidate: the messages come from the form, not the browser. -->
          <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
            <mat-form-field appearance="outline" class="login__field">
              <mat-label>Email</mat-label>
              <!--
                "username" is the correct autocomplete token for the identifier
                field even when it holds an email — password managers key off it
                together with current-password below.
              -->
              <input
                matInput
                type="email"
                formControlName="email"
                autocomplete="username"
                required
              />
              @if (form.controls.email.touched && form.controls.email.invalid) {
                <mat-error>Enter a valid email address</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="login__field">
              <mat-label>Password</mat-label>
              <input
                matInput
                type="password"
                formControlName="password"
                autocomplete="current-password"
                required
              />
              @if (form.controls.password.touched && form.controls.password.invalid) {
                <mat-error>Password is required</mat-error>
              }
            </mat-form-field>

            <div class="login__row">
              <mat-checkbox formControlName="rememberMe">Remember me</mat-checkbox>
              <a routerLink="/forgot-password" class="login__link">Forgot password?</a>
            </div>

            @if (error()) {
              <p class="login__error" role="alert">{{ error() }}</p>
            }

            <button matButton="filled" type="submit" [disabled]="busy()">
              @if (busy()) {
                <mat-spinner diameter="16" />
              }
              {{ busy() ? 'Signing in…' : 'Sign in' }}
            </button>

            <p class="login__note">
              “Remember me” keeps you signed in for 30 days. Leave it off and the session ends when
              the browser closes.
            </p>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: `
    .login { display: flex; justify-content: center; padding: 48px 16px; }
    .login__card { width: 400px; }
    .login__field { width: 100%; }
    .login__row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }
    .login__link { color: var(--mat-sys-primary); font: var(--mat-sys-body-small); }
    .login__hint {
      background: var(--mat-sys-secondary-container);
      color: var(--mat-sys-on-secondary-container);
      padding: 10px 12px;
      border-radius: 8px;
      font: var(--mat-sys-body-small);
      margin: 0 0 16px;
    }
    .login__error {
      color: var(--mat-sys-error);
      font: var(--mat-sys-body-small);
      margin: 0 0 12px;
    }
    .login__note {
      margin: 12px 0 0;
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-body-small);
    }
  `,
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly snackbar = inject(SnackbarService);
  private readonly fb = inject(FormBuilder);

  protected readonly isDev = IS_DEV;
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
    rememberMe: [false],
  });

  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.busy.set(true);
    this.error.set(null);
    try {
      await this.auth.login(this.form.getRawValue());
      this.snackbar.success('Welcome back!');
      const returnTo = this.route.snapshot.queryParamMap.get('returnTo') ?? DEFAULT_DESTINATION;
      await this.router.navigateByUrl(returnTo, { replaceUrl: true });
    } catch (caught) {
      // The API's own message is the useful one here ("Email or password is
      // incorrect", "Too many failed attempts"). `getUserMessage` maps every
      // 401 to a generic "please sign in", which is right for an expired
      // session and useless on the form you are already signing in with.
      const normalized = normalizeError(caught);
      this.error.set(normalized.message || getUserMessage(normalized));
    } finally {
      this.busy.set(false);
    }
  }
}
