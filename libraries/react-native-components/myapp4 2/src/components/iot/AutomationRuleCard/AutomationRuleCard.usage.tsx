import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Text } from 'react-native-paper';

import { useAppTheme } from '@/theme';

import { AutomationRuleCard } from './AutomationRuleCard';
import sample from './AutomationRuleCard.sample.json';
import { loadSample } from '../types/sample';
import type { AutomationRule } from '../types/domain';

const RULES = loadSample<{ rules: AutomationRule[] }>(sample).rules;

export const AutomationRuleCardUsage = () => {
  const theme = useAppTheme();
  const [rules, setRules] = useState(RULES);

  const handleToggle = (rule: AutomationRule, enabled: boolean) =>
    new Promise<void>((resolve, reject) => {
      setTimeout(() => {
        if (rule.id === 'rule-leak' && enabled === false) {
          reject(new Error('cannot disable safety rule'));
          return;
        }
        setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, enabled } : r)));
        resolve();
      }, 500);
    });

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.sm }}>
      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
        Toggling "Leak shutoff" off simulates a rejected safety-rule change and rolls back.
      </Text>
      {rules.map((rule) => (
        <View key={rule.id}>
          <AutomationRuleCard
            rule={rule}
            onToggle={handleToggle}
            onEdit={() => {}}
            onRunNow={() => {}}
            onMore={() => {}}
          />
        </View>
      ))}
    </ScrollView>
  );
};
