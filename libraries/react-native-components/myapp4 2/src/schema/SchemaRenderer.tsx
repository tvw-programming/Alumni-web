import React, { useMemo } from 'react';
import { View } from 'react-native';
import { Text } from 'react-native-paper';

import { AppCard } from '@ui/molecules/AppCard';
import { FilterChipGroup } from '@ui/molecules/FilterChipGroup';
import { SegmentedTabs } from '@ui/molecules/SegmentedTabs';
import { StateView } from '@ui/molecules/StateView';
import { SearchHeader } from '@ui/organisms/SearchHeader';
import { useAppTheme } from '@/theme';

import { useActionHandlers, useDataSource } from './runtime';
import { parseScreenSchema, type SchemaNode } from './types';

/**
 * Whitelist. A node type that is not in here simply does not render — the
 * server cannot name a component this build does not have.
 */
export const COMPONENT_REGISTRY: Record<string, React.ComponentType<never>> = {
  SearchHeader: SearchHeader as React.ComponentType<never>,
  FilterChipGroup: FilterChipGroup as React.ComponentType<never>,
  SegmentedTabs: SegmentedTabs as React.ComponentType<never>,
  AppCard: AppCard as React.ComponentType<never>,
  StateView: StateView as React.ComponentType<never>,
};

const UnknownNode = ({ type }: { type: string }) => {
  const theme = useAppTheme();
  return (
    <View style={{ padding: theme.spacing.md, backgroundColor: theme.colors.errorContainer, borderRadius: theme.radii.md }}>
      <Text style={{ color: theme.colors.onErrorContainer }}>Unknown component: {type}</Text>
    </View>
  );
};

const NodeRenderer = ({ node }: { node: SchemaNode }) => {
  const Component = COMPONENT_REGISTRY[node.type] as React.ComponentType<Record<string, unknown>> | undefined;
  const handlers = useActionHandlers(node.actions);
  const data = useDataSource<unknown>(node.dataSource);

  // Hooks run before this bail-out, so the order stays stable.
  if (!Component) {
    return __DEV__ ? <UnknownNode type={node.type} /> : null;
  }

  return (
    <Component {...(node.props ?? {})} {...handlers} {...(data !== undefined ? { data } : {})}>
      {node.children?.map((child) => (
        <NodeRenderer key={child.id} node={child} />
      ))}
    </Component>
  );
};

export interface SchemaRendererProps {
  schema: unknown;
  /** Bundled in the app, used when the fetch fails or the payload is invalid. */
  fallback?: unknown;
  testID?: string;
}

export const SchemaRenderer = ({ schema, fallback, testID }: SchemaRendererProps) => {
  const parsed = useMemo(() => {
    const primary = parseScreenSchema(schema);
    if (primary.ok) return primary;
    if (fallback === undefined) return primary;
    if (__DEV__) console.warn(`[schema] Falling back to the bundled screen: ${primary.error}`);
    return parseScreenSchema(fallback);
  }, [fallback, schema]);

  if (!parsed.ok || !parsed.data) {
    return (
      <StateView
        preset="error"
        title="We could not load this screen"
        description={__DEV__ ? parsed.error : 'Please try again in a moment.'}
        testID={testID ? `${testID}-invalid` : undefined}
      />
    );
  }

  return (
    <View testID={testID}>
      {parsed.data.components.map((node) => (
        <NodeRenderer key={node.id} node={node} />
      ))}
    </View>
  );
};
