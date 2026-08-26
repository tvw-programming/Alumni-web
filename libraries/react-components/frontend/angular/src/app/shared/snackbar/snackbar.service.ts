import { Injectable, inject } from '@angular/core';
import {
  MatSnackBar,
  type MatSnackBarConfig,
  type MatSnackBarHorizontalPosition,
  type MatSnackBarVerticalPosition,
} from '@angular/material/snack-bar';

/** Severity, which selects the panel class and the default duration. */
export type SnackbarVariant = 'success' | 'info' | 'warning' | 'error';

export interface SnackbarOptions {
  /** Label and handler for a trailing action button (for example "Undo"). */
  action?: { label: string; onClick: () => void };
  /** Milliseconds before auto-hide, or `null` to stay until dismissed. */
  duration?: number | null;
  /** Set false to drop the dismiss button. Ignored when an action is given. */
  dismissible?: boolean;
  vertical?: MatSnackBarVerticalPosition;
  horizontal?: MatSnackBarHorizontalPosition;
}

/** Errors stay longest — they are the ones worth reading. */
const DEFAULT_DURATION: Record<SnackbarVariant, number> = {
  success: 5000,
  info: 5000,
  warning: 6000,
  error: 8000,
};

/**
 * Thin wrapper over `MatSnackBar`, replacing the React app's snackbar bus.
 *
 * The React version needed a module-level event bus so non-component code (the
 * query client's global error handler) could raise a toast. Angular's DI makes
 * that unnecessary: anything with an injector can `inject(SnackbarService)`.
 *
 * Options are one optional argument rather than an overload per variant, so
 * adding a capability does not multiply the method count.
 */
@Injectable({ providedIn: 'root' })
export class SnackbarService {
  private readonly snackBar = inject(MatSnackBar);

  success(message: string, options?: SnackbarOptions): void {
    this.open('success', message, options);
  }

  info(message: string, options?: SnackbarOptions): void {
    this.open('info', message, options);
  }

  warning(message: string, options?: SnackbarOptions): void {
    this.open('warning', message, options);
  }

  error(message: string, options?: SnackbarOptions): void {
    this.open('error', message, options);
  }

  private open(variant: SnackbarVariant, message: string, options: SnackbarOptions = {}): void {
    const { action, dismissible = true } = options;
    // `null` means "stay until dismissed" and `undefined` means "use the
    // default", so the two cannot be collapsed with `??`.
    const duration = options.duration === undefined ? DEFAULT_DURATION[variant] : options.duration;

    const config: MatSnackBarConfig = {
      // MatSnackBar reads 0 as "no auto-hide".
      duration: duration ?? 0,
      horizontalPosition: options.horizontal ?? 'center',
      verticalPosition: options.vertical ?? 'bottom',
      panelClass: `snackbar--${variant}`,
    };

    // A snackbar that neither auto-hides nor has a button cannot be closed at
    // all, so the dismiss button is forced back on in that case.
    const label = action?.label ?? (dismissible || duration === null ? 'Dismiss' : '');
    const ref = this.snackBar.open(message, label, config);

    if (action) {
      // The only `subscribe` in feature-adjacent code, and it is at a genuine
      // boundary: Material's ref exposes the click as an Observable.
      ref.onAction().subscribe(() => {
        action.onClick();
      });
    }
  }
}
