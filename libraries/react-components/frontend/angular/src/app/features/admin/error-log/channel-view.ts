import { computed, inject, signal } from '@angular/core';

import { ErrorLogStore } from '../../../core/errors/error-log-store';
import { countByLevel, filterLogs, groupByFingerprint } from '../../../core/errors/error-logger';

import type { ErrorLogChannel, ErrorLogLevel } from '../../../core/errors/error-log.types';

/**
 * One channel's slice of the log, with its own filter state.
 *
 * This is React's `useErrorLog` hook. A hook cannot be expressed directly in
 * Angular, but a factory returning signals is the same idea and composes the
 * same way: a tab calls it once and gets everything it needs.
 *
 * Filter state lives here rather than in each tab, which is what keeps the
 * three tabs thin — they choose a channel and a set of columns, and share every
 * behaviour.
 *
 * Must be called in an injection context, since it injects the store.
 */
export function channelView(channel: ErrorLogChannel) {
  const store = inject(ErrorLogStore);

  const level = signal<ErrorLogLevel | 'all'>('all');
  const search = signal('');
  const grouped = signal(false);

  const entries = computed(() => store.entries().filter((entry) => entry.channel === channel));

  const filtered = computed(() =>
    filterLogs(entries(), { level: level(), search: search() }),
  );

  const groups = computed(() => groupByFingerprint(filtered()));

  const counts = computed(() => countByLevel(entries()));

  /** What the table renders: one row per group, or one per entry. */
  const rows = computed(() => (grouped() ? groups().map((group) => group.entry) : filtered()));

  /** Occurrence count per fingerprint, shown only in grouped mode. */
  const countByFingerprint = computed(() =>
    grouped() ? new Map(groups().map((group) => [group.entry.fingerprint, group.count])) : null,
  );

  return {
    entries,
    filtered,
    rows,
    counts,
    countByFingerprint,
    level,
    search,
    grouped,
    refresh: () => {
      store.refresh();
    },
    clearChannel: () => {
      store.clearChannel(channel);
    },
  };
}

export type ChannelView = ReturnType<typeof channelView>;
