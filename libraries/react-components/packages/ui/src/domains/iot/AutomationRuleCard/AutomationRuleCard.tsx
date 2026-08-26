import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';

import { describe, timeLabel, useOptimisticValue } from '../../../foundation';

export interface AutomationRule {
  id: string;
  name: string;
  /** "If motion is detected after sunset, turn on hallway lights." */
  summary: string;
  enabled: boolean;
  lastRunAt?: string;
  /** Set when the system paused it — a broken trigger, a removed device. */
  pausedReason?: string;
}

export interface AutomationRuleCardProps {
  rule: AutomationRule;
  onToggleEnabled: (enabled: boolean) => Promise<void>;
}

/**
 * One automation.
 *
 * `summary` is a sentence, not a rule tree: *"If motion is detected after
 * sunset, turn on hallway lights."* Automations are written once and read for
 * years, usually by someone who did not write them, and a trigger/condition/
 * action tree is unreadable at a glance.
 *
 * A system-paused rule states why. "Paused" alone leaves the user toggling a
 * switch that turns itself off again.
 */
export function AutomationRuleCard({ rule, onToggleEnabled }: AutomationRuleCardProps) {
  const [enabled, toggle, pending] = useOptimisticValue(rule.enabled, async (next) => {
    await onToggleEnabled(next);
  });

  return (
    <Card variant="outlined" sx={{ opacity: enabled ? 1 : 0.75 }}>
      <CardContent>
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          <Stack sx={{ flexGrow: 1, minWidth: 0 }} spacing={0.25}>
            <Typography
              variant="subtitle2"
              fontWeight={700}
              aria-label={describe(
                rule.name,
                rule.summary,
                enabled ? 'enabled' : 'disabled',
                rule.pausedReason,
                rule.lastRunAt ? `last ran ${timeLabel(rule.lastRunAt)}` : 'has not run yet',
              )}
            >
              {rule.name}
            </Typography>
            <Typography variant="caption" color="text.secondary" aria-hidden>
              {rule.summary}
            </Typography>

            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ mt: 0.5 }}
              flexWrap="wrap"
              useFlexGap
            >
              {rule.pausedReason ? (
                <Chip
                  size="small"
                  color="warning"
                  variant="outlined"
                  label={`Paused · ${rule.pausedReason}`}
                  aria-hidden
                />
              ) : null}
              <Typography variant="caption" color="text.secondary" aria-hidden>
                {rule.lastRunAt
                  ? `Last ran ${timeLabel(rule.lastRunAt).split(' (')[0]}`
                  : 'Has not run yet'}
              </Typography>
            </Stack>
          </Stack>

          <Switch
            checked={enabled}
            disabled={pending}
            onChange={(event) => {
              toggle(event.target.checked);
            }}
            inputProps={{ 'aria-label': `${enabled ? 'Disable' : 'Enable'} ${rule.name}` }}
          />
        </Stack>
      </CardContent>
    </Card>
  );
}
