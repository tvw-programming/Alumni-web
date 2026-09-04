/**
 * USAGE — AgentInfoCard
 *
 * The OTP is never rendered in the tree until the user taps "reveal" — copy
 * just asks the host screen to write the clipboard, keeping the permission
 * out of the presentational component.
 */
import React, { useState } from 'react';
import { ScrollView } from 'react-native';
import { SegmentedButtons } from 'react-native-paper';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { Agent, OtpCodeStatus } from '../types/domain';
import { AgentInfoCard } from './AgentInfoCard';
import rawSample from './AgentInfoCard.sample.json';

type Scenario = { agent: Agent; otpCode?: string; otpStatus?: OtpCodeStatus; otpExpiresInSeconds?: number; maskedPhoneLabel?: string };
const sample = loadSample<Record<'assignedWithOtp' | 'arrived' | 'expired' | 'changed', Scenario>>(rawSample);

const SCENARIOS: { value: keyof typeof sample; label: string }[] = [
  { value: 'assignedWithOtp', label: 'En route' },
  { value: 'arrived', label: 'Arrived' },
  { value: 'expired', label: 'Expired' },
  { value: 'changed', label: 'Changed' },
];

export const AgentInfoCardUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const [scenario, setScenario] = useState<keyof typeof sample>('assignedWithOtp');

  const data = sample[scenario];

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.lg }}>
      <SegmentedButtons
        value={scenario}
        onValueChange={(v) => setScenario(v as keyof typeof sample)}
        buttons={SCENARIOS.map((s) => ({ value: s.value, label: s.label }))}
      />
      <AgentInfoCard
        key={scenario}
        agent={data.agent}
        otpCode={data.otpCode}
        otpStatus={data.otpStatus}
        otpExpiresInSeconds={data.otpExpiresInSeconds}
        maskedPhoneLabel={data.maskedPhoneLabel}
        onCall={() => toast.show('Calling via masked number…')}
        onChat={() => toast.show('Opening chat')}
        onCopyOtp={(code) => toast.success(`Code ${code} copied`)}
        onReportSafetyIssue={() => toast.show('Opening safety report')}
        onExplainVerification={() => toast.show(data.agent.verificationScope ?? 'Verified provider')}
      />
    </ScrollView>
  );
};
