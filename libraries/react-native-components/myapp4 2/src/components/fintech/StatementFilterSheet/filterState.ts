import type { StatementFilters } from '../types/domain';

/**
 * Filter state as serializable data.
 *
 * Kept out of the visual layer so it can live in navigation state, be
 * deep-linked, shared, restored after process death, and — critically — be
 * translated into the SAME query semantics the backend applies.
 */

export const EMPTY_FILTERS: StatementFilters = {};

export const countActiveFilters = (filters: StatementFilters): number =>
  (filters.date?.preset || filters.date?.from ? 1 : 0) +
  (filters.types?.length ?? 0) +
  (filters.statuses?.length ?? 0) +
  (filters.accountIds?.length ?? 0) +
  (filters.categoryIds?.length ?? 0) +
  (filters.merchantQuery ? 1 : 0);

export const hasActiveFilters = (filters: StatementFilters): boolean => countActiveFilters(filters) > 0;

/** URL/navigation-state serialization. */
export const encodeFilters = (filters: StatementFilters): string =>
  encodeURIComponent(JSON.stringify(filters));

export const decodeFilters = (encoded: string): StatementFilters => {
  try {
    return JSON.parse(decodeURIComponent(encoded)) as StatementFilters;
  } catch {
    return EMPTY_FILTERS;
  }
};

export interface DatePresetOption {
  key: string;
  label: string;
  resolve: (now?: Date) => { from: string; to: string };
}

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const iso = (date: Date) => date.toISOString();

/**
 * Ranges are inclusive of both endpoints. The end date is pushed to 23:59:59.999
 * local time — an exclusive end date is the single most common off-by-one in
 * statement filtering, and it silently drops the most recent day's transactions.
 */
export const DATE_PRESETS: DatePresetOption[] = [
  {
    key: 'thisWeek',
    label: 'This week',
    resolve: (now = new Date()) => {
      const start = startOfDay(now);
      start.setDate(start.getDate() - start.getDay());
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      return { from: iso(start), to: iso(end) };
    },
  },
  {
    key: 'thisMonth',
    label: 'This month',
    resolve: (now = new Date()) => {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      return { from: iso(start), to: iso(end) };
    },
  },
  {
    key: 'lastMonth',
    label: 'Last month',
    resolve: (now = new Date()) => {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { from: iso(start), to: iso(end) };
    },
  },
  {
    key: 'last90',
    label: 'Last 90 days',
    resolve: (now = new Date()) => {
      const start = startOfDay(new Date(now.getTime() - 89 * 86_400_000));
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      return { from: iso(start), to: iso(end) };
    },
  },
];

export const validateDateRange = (from?: string, to?: string): string | null => {
  if (!from || !to) return null;
  if (new Date(from) > new Date(to)) return 'The start date must be before the end date';
  return null;
};

/** Human-readable chips for the underlying screen, so filters stay visible. */
export const summarizeFilters = (
  filters: StatementFilters,
  labels: { types?: Record<string, string>; statuses?: Record<string, string>; accounts?: Record<string, string> } = {},
): Array<{ key: string; label: string }> => {
  const summary: Array<{ key: string; label: string }> = [];

  if (filters.date?.preset) {
    const preset = DATE_PRESETS.find((p) => p.key === filters.date?.preset);
    summary.push({ key: 'date', label: preset?.label ?? 'Custom dates' });
  } else if (filters.date?.from) {
    summary.push({ key: 'date', label: 'Custom dates' });
  }

  filters.types?.forEach((type) => summary.push({ key: `type-${type}`, label: labels.types?.[type] ?? type }));
  filters.statuses?.forEach((status) =>
    summary.push({ key: `status-${status}`, label: labels.statuses?.[status] ?? status }),
  );
  filters.accountIds?.forEach((id) =>
    summary.push({ key: `account-${id}`, label: labels.accounts?.[id] ?? id }),
  );
  if (filters.merchantQuery) summary.push({ key: 'merchant', label: `"${filters.merchantQuery}"` });

  return summary;
};
