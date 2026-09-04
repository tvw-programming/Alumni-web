/**
 * USAGE — ConsentDialog
 *
 * Note two behaviours worth checking: the optional items start unticked and
 * cannot be pre-selected, and the re-consent flow does NOT carry over the
 * previous agreement because the policy version changed.
 */
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Text } from 'react-native-paper';

import { AppButton } from '@ui/atoms/AppButton';
import { AppCard } from '@ui/molecules/AppCard';
import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { ConsentItem, ConsentRecord } from '../types/domain';
import { ConsentDialog } from './ConsentDialog';
import sample from './ConsentDialog.sample.json';

interface Flow {
  title: string;
  reason: string;
  blocking?: boolean;
  policyChangedNote?: string;
  items: ConsentItem[];
}

const data = loadSample<{
  telehealth: Flow;
  reconsent: Flow;
  existingRecords: ConsentRecord[];
}>(sample);

export const ConsentDialogUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();

  const [open, setOpen] = useState<'telehealth' | 'reconsent' | null>(null);
  const [records, setRecords] = useState<ConsentRecord[]>([]);

  const flow = open ? data[open] : null;

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
        The two required items must be agreed before the visit can start. Recording and research are optional and begin
        unticked — there is no code path in the controller that pre-selects them.
      </Text>

      <AppButton variant="primary" fullWidth onPress={() => setOpen('telehealth')}>
        Telehealth consent (blocking)
      </AppButton>
      <AppButton variant="secondary" fullWidth onPress={() => setOpen('reconsent')}>
        Re-consent after a policy change
      </AppButton>

      {records.length > 0 ? (
        <AppCard variant="filled" title="Audit records written">
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }} selectable>
            {/* Subject, version, timestamp, actor, scope and method — all captured. */}
            {JSON.stringify(records, null, 1)}
          </Text>
        </AppCard>
      ) : null}

      {flow ? (
        <ConsentDialog
          visible
          title={flow.title}
          reason={flow.reason}
          items={flow.items}
          subject="patient:1042"
          actor="patient:1042"
          existingRecords={open === 'reconsent' ? data.existingRecords : undefined}
          blocking={flow.blocking}
          policyChangedNote={flow.policyChangedNote}
          onAccept={(next) => {
            setRecords(next);
            setOpen(null);
            const declinedOptional = next.filter((record) => !record.accepted).length;
            toast.success(
              declinedOptional > 0 ? `Saved — ${declinedOptional} optional item(s) declined` : 'All consents recorded',
            );
          }}
          onDecline={(next) => {
            setRecords(next);
            setOpen(null);
            toast.show('Declined — nothing was recorded as agreed');
          }}
          onDismiss={() => setOpen(null)}
          testID="consent"
        />
      ) : null}

      <View style={{ height: theme.spacing.xl }} />
    </ScrollView>
  );
};
