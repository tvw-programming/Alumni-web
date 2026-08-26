import React, { createContext, useCallback, useContext, useMemo } from 'react';

import type { SchemaAction } from './types';

/**
 * Actions arrive as *names*. This is where a name becomes behaviour — in the
 * client, in typed code, where it can be reviewed and tested.
 */
export type ActionExecutor = (action: SchemaAction, payload?: unknown) => void;

const ActionContext = createContext<ActionExecutor | null>(null);
const DataSourceContext = createContext<Record<string, unknown>>({});

export const ActionProvider = ({
  execute,
  children,
}: {
  execute: ActionExecutor;
  children: React.ReactNode;
}) => <ActionContext.Provider value={execute}>{children}</ActionContext.Provider>;

export const DataSourceProvider = ({
  sources,
  children,
}: {
  sources: Record<string, unknown>;
  children: React.ReactNode;
}) => <DataSourceContext.Provider value={sources}>{children}</DataSourceContext.Provider>;

/** Turns `{ onItemPress: { type: 'NAVIGATE', … } }` into real callback props. */
export const useActionHandlers = (
  actions: Record<string, SchemaAction> | undefined,
): Record<string, (payload?: unknown) => void> => {
  const execute = useContext(ActionContext);

  return useMemo(() => {
    if (!actions || !execute) return {};
    return Object.entries(actions).reduce<Record<string, (payload?: unknown) => void>>(
      (acc, [prop, action]) => {
        acc[prop] = (payload?: unknown) => execute(action, payload);
        return acc;
      },
      {},
    );
  }, [actions, execute]);
};

export const useDataSource = <T,>(name: string | undefined): T | undefined => {
  const sources = useContext(DataSourceContext);
  return name ? (sources[name] as T | undefined) : undefined;
};

export const useExecuteAction = (): ActionExecutor => {
  const execute = useContext(ActionContext);
  return useCallback(
    (action, payload) => {
      if (!execute && __DEV__) {
        console.warn(`[schema] No ActionProvider — dropped action ${action.type}`);
        return;
      }
      execute?.(action, payload);
    },
    [execute],
  );
};
