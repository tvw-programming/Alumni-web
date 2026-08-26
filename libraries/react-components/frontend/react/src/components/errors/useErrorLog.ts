import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  clearLogs,
  countByLevel,
  filterLogs,
  getLogs,
  groupByFingerprint,
  subscribe,
  type GroupedEntry,
} from '@/utils/errorLogger';

import type { ErrorLogChannel, ErrorLogEntry, ErrorLogLevel } from '@/types/errorLog';

export interface UseErrorLogResult {
  /** Every entry on this channel, newest first. */
  entries: ErrorLogEntry[];
  /** `entries` after the level and search filters. */
  filtered: ErrorLogEntry[];
  /** `filtered` collapsed by fingerprint, for the grouped view. */
  grouped: GroupedEntry[];
  counts: Record<string, number>;
  level: ErrorLogLevel | 'all';
  setLevel: (level: ErrorLogLevel | 'all') => void;
  search: string;
  setSearch: (search: string) => void;
  refresh: () => void;
  /** Clears this channel only, leaving the other tabs' entries intact. */
  clearChannel: () => void;
}

/**
 * One channel's slice of the log, live-updated.
 *
 * Owning filter state here rather than in each tab is what lets the three tabs
 * be thin: they choose a channel and columns, and share every behavior.
 */
export function useErrorLog(channel: ErrorLogChannel): UseErrorLogResult {
  const [all, setAll] = useState<ErrorLogEntry[]>(() => getLogs());
  const [level, setLevel] = useState<ErrorLogLevel | 'all'>('all');
  const [search, setSearch] = useState('');

  // Live-update while the app is used in another tab or view.
  useEffect(() => subscribe(setAll), []);

  const entries = useMemo(() => all.filter((entry) => entry.channel === channel), [all, channel]);
  const filtered = useMemo(() => filterLogs(entries, { level, search }), [entries, level, search]);
  const grouped = useMemo(() => groupByFingerprint(filtered), [filtered]);
  const counts = useMemo(() => countByLevel(entries), [entries]);

  const refresh = useCallback(() => setAll(getLogs()), []);
  const clearChannel = useCallback(() => {
    clearLogs(channel);
    setAll(getLogs());
  }, [channel]);

  return {
    entries,
    filtered,
    grouped,
    counts,
    level,
    setLevel,
    search,
    setSearch,
    refresh,
    clearChannel,
  };
}
