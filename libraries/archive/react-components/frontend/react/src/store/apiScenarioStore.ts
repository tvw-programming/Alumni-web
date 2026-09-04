import { useSyncExternalStore } from 'react';

import type { ApiScenarioRun } from '@/types/apiScenario';

let snapshot: readonly ApiScenarioRun[] = [];
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

export const apiScenarioStore = {
  add: (run: ApiScenarioRun): void => {
    snapshot = [run, ...snapshot].slice(0, 10);
    emit();
  },
  clear: (): void => {
    snapshot = [];
    emit();
  },
  getSnapshot: (): readonly ApiScenarioRun[] => snapshot,
  subscribe: (listener: () => void): (() => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

/** Small external demo store; server data itself remains in TanStack Query. */
export function useApiScenarioRuns(): readonly ApiScenarioRun[] {
  return useSyncExternalStore(apiScenarioStore.subscribe, apiScenarioStore.getSnapshot);
}
