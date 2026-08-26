import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';
import { switchMap } from 'rxjs';

import { fieldErrorText } from '../form-helpers';

import type { FieldConfig } from '../form.types';

/**
 * Shared base for field renderers.
 *
 * The control arrives as an **input** rather than being resolved from a parent
 * `ControlContainer`. `NgComponentOutlet` instantiates components outside the
 * `formGroup` directive's injector, so `formControlName` cannot find its parent
 * there (NG01050). Passing the control explicitly also makes each renderer
 * trivially testable in isolation.
 */
@Component({
  selector: 'app-field-base',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '',
})
export class FieldBase {
  readonly field = input.required<FieldConfig>();
  readonly control = input.required<FormControl>();

  protected readonly isRequired = computed(() => this.field().validation?.required === true);

  /**
   * Reactive trigger for the error message.
   *
   * `control.touched`, `.status` and `.errors` are plain properties, not
   * signals — a `computed` reading them would evaluate once and never update,
   * so validation messages would never appear. `control.events` emits on
   * touched/status/value changes, and converting it here is the one place RxJS
   * is allowed: at the boundary, immediately turned into a signal.
   */
  private readonly controlEvents = toSignal(
    toObservable(this.control).pipe(switchMap((control) => control.events)),
    { initialValue: null },
  );

  /**
   * Errors surface only once the user has interacted, matching the React app —
   * a form should not shout at someone who has not typed yet.
   */
  protected readonly errorText = computed(() => {
    this.controlEvents();
    const control = this.control();
    if (!(control.touched || control.dirty) || control.valid) return null;
    return this.describe(control.errors);
  });

  private describe(errors: Record<string, unknown> | null): string | null {
    if (!errors) return null;
    const field = this.field();
    if (errors['required']) return `${field.label} is required`;
    if (errors['minlength']) {
      const n = (errors['minlength'] as { requiredLength: number }).requiredLength;
      return `Must be at least ${String(n)} characters`;
    }
    if (errors['maxlength']) {
      const n = (errors['maxlength'] as { requiredLength: number }).requiredLength;
      return `Must be at most ${String(n)} characters`;
    }
    if (errors['min']) return `Must be at least ${String((errors['min'] as { min: number }).min)}`;
    if (errors['max']) return `Must be at most ${String((errors['max'] as { max: number }).max)}`;
    if (errors['email']) return 'Enter a valid email address';
    if (errors['pattern']) return `${field.label} is not in the expected format`;
    // Reuse the React helper for anything a custom validator produced.
    return fieldErrorText(Object.values(errors)) ?? 'Invalid value';
  }
}
