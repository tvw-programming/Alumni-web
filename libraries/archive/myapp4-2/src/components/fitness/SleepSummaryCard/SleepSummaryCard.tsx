import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Icon, Text, TouchableRipple } from 'react-native-paper';

import { AppButton } from '@ui/atoms/AppButton';
import { AppCard } from '@ui/molecules/AppCard';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useWellnessTheme } from '../theme/fitnessTokens';
import type { SleepSummary } from '../types/domain';

const STAGE_META: { key: keyof NonNullable<SleepSummary['stages']>; label: string; colorKey: 'sleepDeep' | 'sleepLight' | 'sleepRem' | 'sleepAwake' }[] = [
  { key: 'deep', label: 'Deep', colorKey: 'sleepDeep' },
  { key: 'light', label: 'Light', colorKey: 'sleepLight' },
  { key: 'rem', label: 'REM', colorKey: 'sleepRem' },
  { key: 'awake', label: 'Awake', colorKey: 'sleepAwake' },
];

const formatDuration = (minutes: number) => `${Math.floor(minutes / 60)} h ${minutes % 60} m`;

export interface SleepSummaryCardProps extends StyleEscapeHatches {
  summary: SleepSummary;
  onPressDetails?: () => void;
}

/**
 * A restrained, calming palette — no red for a low score, since this is
 * wellness context, not a clinical alert. The score is never presented as a
 * diagnosis, and every stage bar segment carries its own text label and
 * minute value, never colour alone.
 */
export const SleepSummaryCard = ({ summary, onPressDetails, style, containerStyle, testID }: SleepSummaryCardProps) => {
  const theme = useAppTheme();
  const wellness = useWellnessTheme();
  const id = testID ?? 'sleep-summary-card';

  if (summary.status === 'missing') {
    return (
      <AppCard variant="outlined" containerStyle={containerStyle} style={style} testID={id}>
        <View style={{ alignItems: 'center', gap: 6, paddingVertical: theme.spacing.sm }}>
          <Icon source="sleep" size={28} color={wellness.colors.onSurfaceVariant} />
          <Text variant="bodyMedium" style={{ color: wellness.colors.onSurfaceVariant }}>
            No sleep data
          </Text>
          <Text variant="labelSmall" style={{ color: wellness.colors.onSurfaceVariant, textAlign: 'center' }}>
            Wear your device to track sleep.
          </Text>
        </View>
      </AppCard>
    );
  }

  if (summary.status === 'syncing') {
    return (
      <AppCard variant="outlined" containerStyle={containerStyle} style={style} testID={childTestID(id, 'syncing')}>
        <View style={styles.row}>
          <ActivityIndicator size={18} />
          <Text variant="bodyMedium" style={{ marginLeft: 8, color: wellness.colors.onSurfaceVariant }}>
            Syncing sleep data…
          </Text>
        </View>
      </AppCard>
    );
  }

  const totalStageMinutes = summary.stages ? Object.values(summary.stages).reduce((sum, v) => sum + (v ?? 0), 0) : 0;
  const goalMet = summary.goalMinutes != null && summary.durationMinutes != null && summary.durationMinutes >= summary.goalMinutes;

  return (
    <AppCard variant="outlined" containerStyle={containerStyle} style={style} testID={id}>
      <View style={{ gap: theme.spacing.sm }}>
        <Text variant="labelMedium" style={{ color: wellness.colors.onSurfaceVariant }}>
          Sleep summary
        </Text>

        <View style={styles.row}>
          <View style={styles.flex}>
            <Text variant="headlineSmall">{summary.durationMinutes != null ? formatDuration(summary.durationMinutes) : '—'}</Text>
            {goalMet ? (
              <Text variant="labelSmall" style={{ color: wellness.colors.success }}>
                Sleep goal met
              </Text>
            ) : null}
          </View>
          {summary.score != null ? (
            <View style={{ alignItems: 'center' }}>
              <Text variant="titleLarge">{summary.score}</Text>
              <Text variant="labelSmall" style={{ color: wellness.colors.onSurfaceVariant }}>
                Sleep score
              </Text>
            </View>
          ) : null}
        </View>

        {summary.startAt && summary.endAt ? (
          <View style={styles.row}>
            <Icon source="bed-outline" size={13} color={wellness.colors.onSurfaceVariant} />
            <Text variant="labelSmall" style={{ color: wellness.colors.onSurfaceVariant, marginLeft: 4 }}>
              Bedtime {new Date(summary.startAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })} · Wake{' '}
              {new Date(summary.endAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
            </Text>
          </View>
        ) : null}

        {summary.status === 'partial' ? (
          <Text variant="labelSmall" style={{ color: wellness.colors.warning }}>
            Partial night — device disconnected before waking
          </Text>
        ) : summary.status === 'stale' ? (
          <Text variant="labelSmall" style={{ color: wellness.colors.warning }}>
            Data may be out of date
          </Text>
        ) : null}

        {summary.stages && totalStageMinutes > 0 ? (
          <View style={{ gap: 4 }}>
            <View style={[styles.stageBar, { borderRadius: theme.radii.pill }]}>
              {STAGE_META.map((stage) => {
                const minutes = summary.stages?.[stage.key] ?? 0;
                if (minutes <= 0) return null;
                return <View key={stage.key} style={{ flex: minutes, backgroundColor: wellness.colors[stage.colorKey] }} />;
              })}
            </View>
            <View style={styles.legendRow}>
              {STAGE_META.map((stage) => {
                const minutes = summary.stages?.[stage.key];
                if (!minutes) return null;
                return (
                  <View key={stage.key} style={styles.legendItem}>
                    <View style={[styles.dot, { backgroundColor: wellness.colors[stage.colorKey] }]} />
                    <Text variant="labelSmall" style={{ color: wellness.colors.onSurfaceVariant }}>
                      {stage.label} {minutes}m
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        ) : (
          <Text variant="labelSmall" style={{ color: wellness.colors.onSurfaceVariant }}>
            Sleep-stage data unavailable
          </Text>
        )}

        {summary.source ? (
          <Text variant="labelSmall" style={{ color: wellness.colors.onSurfaceVariant }}>
            Source: {summary.source}
          </Text>
        ) : null}

        {onPressDetails ? (
          <AppButton variant="ghost" size="sm" onPress={onPressDetails} testID={childTestID(id, 'details')}>
            View sleep details
          </AppButton>
        ) : null}
      </View>
    </AppCard>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  stageBar: { flexDirection: 'row', height: 10, overflow: 'hidden' },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 4 },
});
