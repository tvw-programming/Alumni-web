import { AutomationRuleCard, type AutomationRule } from './AutomationRuleCard';
import sample from './sample.json';

export function AutomationRuleCardUsage() {
  const rule = sample.rule as unknown as AutomationRule;

  return (
    <AutomationRuleCard
      rule={rule}
      // Enabling is optimistic — it is a stored flag, not a physical device, so
      // there is no acknowledgement to wait for.
      onToggleEnabled={async (enabled) => {
        const response = await fetch(`/api/automations/${rule.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enabled }),
        });
        if (!response.ok) throw await response.json();
      }}
    />
  );
}
