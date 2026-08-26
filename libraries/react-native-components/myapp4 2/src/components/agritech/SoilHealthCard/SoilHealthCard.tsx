import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Icon, ProgressBar, Text } from 'react-native-paper';

import { AppButton } from '@ui/atoms/AppButton';
import { AppCard } from '@ui/molecules/AppCard';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useAgriLogisticsTheme } from '../theme/agritechTokens';
import type { NutrientStatus, SoilReport } from '../types/domain';

export interface SoilHealthCardProps extends StyleEscapeHatches {
  report: SoilReport;
  disclaimer?: string;
  onViewDetails?: (report: SoilReport) => void;
  onRequestTest?: (report: SoilReport) => void;
}

const STATUS_META: Record<NutrientStatus, { label: string; colorKey: 'nutrientLow' | 'nutrientOptimal' | 'nutrientHigh' | 'offline' }> = {
  low: { label: 'Low', colorKey: 'nutrientLow' },
  optimal: { label: 'Optimal', colorKey: 'nutrientOptimal' },
  high: { label: 'High', colorKey: 'nutrientHigh' },
  unknown: { label: 'Unknown', colorKey: 'offline' },
};

/**
 * A nutrient's progress bar never implies its midpoint is universally
 * optimal — the bar only plots value within `min`/`max`, and the status
 * word (`low`/`optimal`/`high`) always comes from the report, never from
 * where the bar happens to land. Interpretation stays disclaimed and
 * crop-specific.
 */
export const SoilHealthCard = ({ report, disclaimer, onViewDetails, onRequestTest, style, containerStyle, testID }: SoilHealthCardProps) => {
  const theme = useAppTheme();
  const agri = useAgriLogisticsTheme();
  const id = testID ?? `soil-${report.fieldName.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <AppCard variant="outlined" containerStyle={containerStyle} style={style} testID={id}>
      <View style={{ gap: theme.spacing.sm }}>
        <View style={styles.row}>
          <View style={styles.flex}>
            <Text variant="titleSmall">{report.fieldName}</Text>
            <Text variant="labelSmall" style={{ color: agri.colors.onSurfaceVariant }}>
              {report.sampleDate ? `Sampled ${report.sampleDate}` : 'No soil test yet'}
              {report.source ? ` · ${report.source}` : ''}
            </Text>
          </View>
        </View>

        {report.status === 'processing' ? (
          <View style={styles.row}>
            <ActivityIndicator size={14} />
            <Text variant="labelSmall" style={{ color: agri.colors.onSurfaceVariant, marginLeft: 6 }}>
              Processing soil sample…
            </Text>
          </View>
        ) : report.status === 'missing' ? (
          <View style={styles.row}>
            <Icon source="flask-outline" size={14} color={agri.colors.onSurfaceVariant} />
            <Text variant="labelSmall" style={{ color: agri.colors.onSurfaceVariant, marginLeft: 6 }}>
              No soil data is available for this field.
            </Text>
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            {report.status === 'stale' ? (
              <View style={styles.row}>
                <Icon source="clock-alert-outline" size={12} color={agri.colors.warning} />
                <Text variant="labelSmall" style={{ color: agri.colors.warning, marginLeft: 4 }}>
                  This report is older than the recommended retest window.
                </Text>
              </View>
            ) : null}
            {report.nutrients.map((nutrient) => {
              const meta = STATUS_META[nutrient.status];
              const range = nutrient.max != null && nutrient.min != null ? Math.max(1, nutrient.max - nutrient.min) : undefined;
              const progress = range != null && nutrient.min != null ? Math.min(1, Math.max(0, (nutrient.value - nutrient.min) / range)) : undefined;
              return (
                <View key={nutrient.id}>
                  <View style={styles.row}>
                    <Text variant="labelMedium" style={styles.flex}>
                      {nutrient.label}
                    </Text>
                    <Text variant="labelMedium" style={{ color: agri.colors[meta.colorKey] }}>
                      {nutrient.value}
                      {nutrient.unit} · {meta.label}
                    </Text>
                  </View>
                  {progress != null ? (
                    <ProgressBar progress={progress} color={agri.colors[meta.colorKey]} style={{ height: 4, borderRadius: 2, marginTop: 2, backgroundColor: agri.colors.surfaceVariant }} />
                  ) : null}
                </View>
              );
            })}
          </View>
        )}

        {disclaimer ? (
          <Text variant="labelSmall" style={{ color: agri.colors.onSurfaceVariant }}>
            {disclaimer}
          </Text>
        ) : null}

        <View style={styles.row}>
          {report.status === 'available' || report.status === 'stale' ? (
            onViewDetails ? (
              <AppButton variant="ghost" size="sm" onPress={() => onViewDetails(report)} testID={childTestID(id, 'view')}>
                View soil report
              </AppButton>
            ) : null
          ) : onRequestTest ? (
            <AppButton variant="primary" size="sm" onPress={() => onRequestTest(report)} testID={childTestID(id, 'test')}>
              Test soil
            </AppButton>
          ) : null}
        </View>
      </View>
    </AppCard>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
});
