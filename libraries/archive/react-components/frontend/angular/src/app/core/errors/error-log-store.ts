import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';

import { clearLogs, getLogs, subscribe } from './error-logger';

import type { ErrorLogChannel, ErrorLogEntry } from './error-log.types';

/**
 * The error log, as a signal.
 *
 * `error-logger.ts` is framework-free and ported verbatim from React, so it
 * publishes changes through a callback `subscribe`. This service is the single
 * place that callback is bridged into a signal — every consumer reads
 * `entries()` and nothing else in the app subscribes.
 *
 * React needed `useSyncExternalStore` in each consumer for the same job. One
 * root service replaces all of them, and the subscription is established once
 * for the life of the app rather than once per mounted view.
 */
@Injectable({ providedIn: 'root' })
export class ErrorLogStore {
  private readonly entriesSignal = signal<ErrorLogEntry[]>(getLogs());

  readonly entries = this.entriesSignal.asReadonly();

  /** Entry counts per channel, for the tab badges. */
  readonly channelCounts = computed(() => {
    const counts: Record<string, number> = {};
    for (const entry of this.entriesSignal()) {
      counts[entry.channel] = (counts[entry.channel] ?? 0) + 1;
    }
    return counts;
  });

  constructor() {
    const unsubscribe = subscribe((entries) => {
      this.entriesSignal.set(entries);
    });
    inject(DestroyRef).onDestroy(unsubscribe);
  }

  /** Re-reads storage. For entries written by another browser tab. */
  refresh(): void {
    this.entriesSignal.set(getLogs());
  }

  /** Clears one channel, leaving the other tabs' entries intact. */
  clearChannel(channel: ErrorLogChannel): void {
    clearLogs(channel);
    this.refresh();
  }

  /** Entries on one channel, newest first. */
  forChannel(channel: ErrorLogChannel): ErrorLogEntry[] {
    return this.entriesSignal().filter((entry) => entry.channel === channel);
  }
}
