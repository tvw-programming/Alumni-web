/**
 * USAGE — ReportBlockSheet
 *
 * Pick "Report" then a safety reason (harassment, self-harm, child safety) to
 * see the escalation panel appear immediately — buried at the end of a form it
 * would be useless. The confirmation deliberately promises no outcome.
 */
import React, { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Switch, Text } from 'react-native-paper';

import { AppButton } from '@ui/atoms/AppButton';
import { AppCard } from '@ui/molecules/AppCard';
import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { ModerationOutcome, ReportReason, ReportTarget, UserSummary } from '../types/domain';
import { ReportBlockSheet } from './ReportBlockSheet';
import sample from './ReportBlockSheet.sample.json';

interface TargetConfig {
  targetKind: ReportTarget;
  targetId: string;
  targetUser: UserSummary;
}

const data = loadSample<{
  reasons: ReportReason[];
  policyUrl: string;
  policyVersion: string;
  targets: Record<string, TargetConfig>;
}>(sample);

type Key = 'post' | 'comment' | 'message' | 'profile' | 'alreadyBlocked';

export const ReportBlockSheetUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();

  const [open, setOpen] = useState<Key | null>(null);
  const [failNext, setFailNext] = useState(false);
  const [outcomes, setOutcomes] = useState<ModerationOutcome[]>([]);

  /** Moderation submission is the caller's job; the sheet only reports intent. */
  const submit = useCallback(
    async (outcome: ModerationOutcome) => {
      await new Promise((resolve) => setTimeout(resolve, 800));
      if (failNext) throw new Error('network');
      setOutcomes((prev) => [outcome, ...prev]);
      toast.show(`${outcome.action} recorded`);
    },
    [failNext, toast],
  );

  const config = open ? data.targets[open] : undefined;

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
        <Text variant="labelMedium" style={{ flex: 1 }}>
          Make the next submission fail
        </Text>
        <Switch value={failNext} onValueChange={setFailNext} accessibilityLabel="Simulate a failed submission" />
      </View>

      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
        Report, block, mute and restrict each explain what they actually do — people pick the wrong one constantly
        because muting is invisible to the other person and blocking is not.
      </Text>

      {(Object.keys(data.targets) as Key[]).map((key) => (
        <AppButton
          key={key}
          variant={key === 'alreadyBlocked' ? 'secondary' : 'primary'}
          fullWidth
          onPress={() => setOpen(key)}
        >
          {key === 'alreadyBlocked' ? 'Already-blocked account' : `Report a ${key}`}
        </AppButton>
      ))}

      {outcomes.length > 0 ? (
        <AppCard variant="filled" title="What the moderation service received">
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }} selectable>
            {JSON.stringify(outcomes.slice(0, 3), null, 1)}
          </Text>
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: theme.spacing.sm }}>
            Report text is never written to analytics — it goes to the moderation queue only.
          </Text>
        </AppCard>
      ) : null}

      {config ? (
        <ReportBlockSheet
          visible
          onDismiss={() => setOpen(null)}
          targetKind={config.targetKind}
          targetId={config.targetId}
          targetUser={config.targetUser}
          reasons={data.reasons}
          policyUrl={data.policyUrl}
          emergencyNumber="112"
          alreadyBlocked={open === 'alreadyBlocked'}
          onUnblock={() => {
            setOpen(null);
            toast.success('Account unblocked');
          }}
          onSubmit={submit}
          testID="report-sheet"
        />
      ) : null}
    </ScrollView>
  );
};
