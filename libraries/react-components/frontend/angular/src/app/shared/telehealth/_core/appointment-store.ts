import { computed, Injectable, signal } from '@angular/core';

import { Appointment, AppointmentId, AppointmentStatus } from './telehealth.types';

/**
 * Appointment state, as signals.
 *
 * Three corrections against the blueprint this was specified from, because the
 * patterns there no longer compile:
 *
 * 1. **`signal.mutate()` does not exist.** It was removed from Angular before
 *    v18. `update()` with an immutable replacement is the supported form, and
 *    it is also what makes `computed()` re-evaluate — mutating an array in
 *    place leaves the signal's reference identical and nothing recomputes.
 * 2. **`computed(() => this._appointments())` is a pointless indirection.**
 *    `signal.asReadonly()` says the same thing without allocating a second
 *    reactive node.
 * 3. **The store holds no HTTP.** Server interaction lives in the API adapter,
 *    so this class is synchronously testable without a mock transport.
 */
@Injectable({ providedIn: 'root' })
export class AppointmentStore {
  private readonly _appointments = signal<readonly Appointment[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly appointments = this._appointments.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  /** Sorted here, not in the template: a template that sorts re-sorts on every
   *  change detection pass. */
  readonly upcoming = computed(() =>
    this._appointments()
      .filter((a) => a.status === 'booked' || a.status === 'confirmed' || a.status === 'checkedIn')
      .sort((a: Appointment, b: Appointment) => a.startsAt.localeCompare(b.startsAt)),
  );

  readonly past = computed(() =>
    this._appointments()
      .filter((a) => a.status === 'completed' || a.status === 'noShow')
      .sort((a: Appointment, b: Appointment) => b.startsAt.localeCompare(a.startsAt)),
  );

  /** The one the UI surfaces first. Null rather than undefined so a template
   *  can distinguish "none" from "not loaded yet" via `loading()`. */
  readonly next = computed<Appointment | null>(() => this.upcoming()[0] ?? null);

  readonly isEmpty = computed(() => !this._loading() && this._appointments().length === 0);

  setAll(list: readonly Appointment[]): void {
    this._appointments.set([...list]);
    this._error.set(null);
  }

  add(appointment: Appointment): void {
    this._appointments.update((current) => [...current, appointment]);
  }

  updateStatus(id: AppointmentId, status: AppointmentStatus): void {
    this._appointments.update((current) =>
      current.map((a) => (a.id === id ? { ...a, status } : a)),
    );
  }

  remove(id: AppointmentId): void {
    this._appointments.update((current) => current.filter((a) => a.id !== id));
  }

  setLoading(loading: boolean): void {
    this._loading.set(loading);
  }

  setError(message: string | null): void {
    this._error.set(message);
    this._loading.set(false);
  }

  /**
   * Cleared on sign-out. Appointments carry PHI, and a store that survives a
   * session hands the next user the previous one's clinical data.
   */
  clear(): void {
    this._appointments.set([]);
    this._error.set(null);
    this._loading.set(false);
  }
}
