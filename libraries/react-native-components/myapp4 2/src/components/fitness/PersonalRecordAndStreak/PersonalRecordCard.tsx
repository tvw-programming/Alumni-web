import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, Text, TouchableRipple } from 'react-native-paper';

import { AppCard } from '@ui/molecules/AppCard';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useWellnessTheme } from '../theme/fitnessTokens';
import type { PersonalRecord } from '../types/domain';

export interface PersonalRecordCardProps extends StyleEscapeHatches {
  record: PersonalRecord;
  onViewHistory?: (record: PersonalRecord) => void;
}

/**
 * Record detection lives in a server or analytics service — this card only
 * renders whatever it's handed, including a `pendingSync` state for a record
 * set offline that hasn't been confirmed yet.
 */
export const PersonalRecordCard = ({ record, onViewHistory, style, containerStyle, testID }: PersonalRecordCardProps) => {
  const theme = useAppTheme();
  const wellness = useWellnessTheme();
  const id = testID ?? `personal-record-${record.id}`;

  return (
    <AppCard variant={record.isNew ? 'elevated' : 'outlined'} containerStyle={containerStyle} style={style} testID={id}>
      <View style={{ gap: 6 }}>
        <View style={styles.row}>
          <Icon source="trophy-outline" size={18} color={wellness.colors.accent} />
          <Text variant="labelMedium" style={{ color: wellness.colors.accent, marginLeft: 6 }}>
            {record.isNew ? 'New personal record' : record.isTied ? 'Record tied' : 'Personal record'}
          </Text>
        </View>

        <Text variant="titleSmall">{record.label}</Text>
        <Text variant="headlineSmall">{record.valueLabel}</Text>

        {record.previousValueLabel ? (
          <Text variant="labelSmall" style={{ color: wellness.colors.onSurfaceVariant }}>
            Previous best: {record.previousValueLabel}
          </Text>
        ) : null}

        <Text variant="labelSmall" style={{ color: wellness.colors.onSurfaceVariant }}>
          {record.activityType} · Set on {new Date(record.achievedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'long' })}
        </Text>

        {record.pendingSync ? (
          <View style={styles.row}>
            <Icon source="cloud-sync-outline" size={13} color={wellness.colors.warning} />
            <Text variant="labelSmall" style={{ color: wellness.colors.warning, marginLeft: 4 }}>
              Syncing — this record isn't confirmed yet
            </Text>
          </View>
        ) : null}

        {onViewHistory ? (
          <TouchableRipple onPress={() => onViewHistory(record)} accessibilityRole="button" accessibilityLabel={`View history for ${record.label}`} testID={childTestID(id, 'history')}>
            <Text variant="labelMedium" style={{ color: theme.colors.primary }}>
              View history
            </Text>
          </TouchableRipple>
        ) : null}
      </View>
    </AppCard>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
});
