/**
 * USAGE — CertificateCard + StreakCounter + BadgeGrid
 *
 * Switch the streak to "reset" and read the copy: it points at rebuilding and
 * keeps the 24-day record visible. No shame language, and the historical
 * achievement is never erased along with the counter.
 */
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SegmentedButtons, Switch, Text } from 'react-native-paper';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { Badge, Certificate, StreakData } from '../types/domain';
import { BadgeGrid } from './BadgeGrid';
import { CertificateCard } from './CertificateCard';
import { StreakCounter } from './StreakCounter';
import sample from './Achievements.sample.json';

const data = loadSample<{
  certificates: Certificate[];
  streaks: Record<string, StreakData>;
  badges: Badge[];
}>(sample);

type StreakKey = 'active' | 'atRisk' | 'reset';

export const AchievementsUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();

  const [streakKey, setStreakKey] = useState<StreakKey>('active');
  const [restrained, setRestrained] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string>();

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.lg }}>
      <Text variant="labelLarge">StreakCounter</Text>
      <SegmentedButtons
        value={streakKey}
        onValueChange={(next) => setStreakKey(next as StreakKey)}
        density="small"
        buttons={[
          { value: 'active', label: 'Active' },
          { value: 'atRisk', label: 'At risk' },
          { value: 'reset', label: 'Reset' },
        ]}
      />

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
        <Text variant="labelMedium" style={{ flex: 1 }}>
          Restrained mode (private, non-competitive)
        </Text>
        <Switch value={restrained} onValueChange={setRestrained} accessibilityLabel="Restrained streak presentation" />
      </View>

      <StreakCounter
        streak={data.streaks[streakKey]!}
        restrained={restrained}
        onSetReminder={() => toast.success('Daily reminder set')}
        onStartLesson={() => toast.show('Opening your next lesson')}
        testID="streak"
      />

      <Text variant="labelLarge">CertificateCard</Text>
      {data.certificates.map((certificate) => (
        <CertificateCard
          key={certificate.id}
          certificate={certificate}
          downloading={downloadingId === certificate.id}
          onDownload={async (item) => {
            setDownloadingId(item.id);
            await new Promise((resolve) => setTimeout(resolve, 900));
            setDownloadingId(undefined);
            toast.success('Certificate downloaded');
          }}
          onShare={() => toast.show('Sharing is optional — opening the share sheet')}
          onVerify={() => toast.show('Opening the verification page')}
        />
      ))}

      <Text variant="labelLarge">BadgeGrid</Text>
      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
        Locked badges show honest progress; the hidden badge admits it exists without spoiling how to earn it.
      </Text>
      <BadgeGrid badges={data.badges} onBadgePress={(badge) => toast.show(badge.title)} testID="badges" />

      <View style={{ height: theme.spacing.xl }} />
    </ScrollView>
  );
};
