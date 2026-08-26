import React, { forwardRef, memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, Text, TouchableRipple } from 'react-native-paper';
import Animated from 'react-native-reanimated';

import { AppCard } from '@ui/molecules/AppCard';
import { SkeletonLoader } from '@ui/atoms/Skeleton';
import { StateView } from '@ui/molecules/StateView';
import { useMotion, type AnimatableProps } from '@/hooks';
import { useAppTheme } from '@/theme';
import { childTestID, formatRelativeDate } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { NotAdviceNotice, ProvenanceLabel } from '../primitives/ClinicalSafety';
import { useHealthTheme } from '../theme/healthcareTokens';
import type { VitalReading, VitalType } from '../types/domain';

const VITAL_META: Record<VitalType, { label: string; icon: string; render: (values: Record<string, number>) => string }> = {
  bloodPressure: {
    label: 'Blood pressure',
    icon: 'heart-pulse',
    // Kept as a pair. Reducing BP to one number loses the clinical meaning.
    render: (values) => `${values.systolic ?? '—'}/${values.diastolic ?? '—'}`,
  },
  glucose: { label: 'Blood glucose', icon: 'water-outline', render: (values) => `${values.value ?? '—'}` },
  heartRate: { label: 'Heart rate', icon: 'heart-outline', render: (values) => `${values.value ?? '—'}` },
  temperature: { label: 'Temperature', icon: 'thermometer', render: (values) => `${values.value ?? '—'}` },
  spo2: { label: 'Oxygen saturation', icon: 'lungs', render: (values) => `${values.value ?? '—'}` },
  weight: { label: 'Weight', icon: 'scale-bathroom', render: (values) => `${values.value ?? '—'}` },
};

const TREND_META = {
  up: { label: 'Increasing', icon: 'trending-up', colorKey: 'trendUp' as const },
  down: { label: 'Decreasing', icon: 'trending-down', colorKey: 'trendDown' as const },
  stable: { label: 'Stable', icon: 'trending-neutral', colorKey: 'trendStable' as const },
  unknown: { label: 'Not enough readings', icon: 'help-circle-outline', colorKey: 'trendStable' as const },
};

/**
 * Interpretation copy. Deliberately non-diagnostic: "outside your usual range"
 * is an observation, "review required" is a prompt to talk to a human. Neither
 * is a conclusion, and neither is computed here.
 */
const INTERPRETATION_META = {
  usual: { label: 'In your usual range', icon: 'check-circle-outline', colorKey: 'rangeUsual' as const },
  outsideUsualRange: { label: 'Outside your usual range', icon: 'information-outline', colorKey: 'rangeOutside' as const },
  reviewRequired: { label: 'Your care team wants to review this', icon: 'stethoscope', colorKey: 'rangeReview' as const },
};

export interface VitalsCardProps extends StyleEscapeHatches, Pick<AnimatableProps, 'animated' | 'entering' | 'index'> {
  reading?: VitalReading;
  /** Multi-vital dashboard mode. */
  readings?: VitalReading[];
  locale?: string;
  loading?: boolean;
  compact?: boolean;
  onViewTrend?: (reading: VitalReading) => void;
  onContactCareTeam?: (reading: VitalReading) => void;
  onAddReading?: () => void;
  /** Show the reference range row when the caller has one to show. */
  showReferenceRange?: boolean;
}

const SingleVital = ({
  reading,
  locale,
  compact,
  onViewTrend,
  onContactCareTeam,
  showReferenceRange,
  testID,
}: {
  reading: VitalReading;
  locale: string;
  compact: boolean;
  onViewTrend?: (reading: VitalReading) => void;
  onContactCareTeam?: (reading: VitalReading) => void;
  showReferenceRange: boolean;
  testID?: string;
}) => {
  const theme = useAppTheme();
  const health = useHealthTheme();

  const meta = VITAL_META[reading.type];
  const trend = TREND_META[reading.trend ?? 'unknown'];
  const interpretation = reading.interpretation ? INTERPRETATION_META[reading.interpretation] : null;

  const spokenValue = useMemo(() => {
    if (reading.type === 'bloodPressure') {
      return `${reading.values.systolic ?? 'unknown'} over ${reading.values.diastolic ?? 'unknown'} ${reading.unit}`;
    }
    return `${reading.values.value ?? 'unknown'} ${reading.unit}`;
  }, [reading]);

  return (
    <View
      style={{ gap: theme.spacing.xs }}
      accessible
      accessibilityRole="text"
      accessibilityLabel={[
        meta.label,
        spokenValue,
        reading.context,
        interpretation?.label,
        `measured ${formatRelativeDate(reading.measuredAt, locale)}`,
      ]
        .filter(Boolean)
        .join(', ')}
      testID={testID}
    >
      <View style={[styles.row, { gap: theme.spacing.xs }]}>
        <Icon source={meta.icon} size={16} color={health.colors.onSurfaceCalm} />
        <Text variant="labelMedium" style={styles.flex}>
          {meta.label}
        </Text>
        {reading.context ? (
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {reading.context}
          </Text>
        ) : null}
      </View>

      <View style={[styles.row, { alignItems: 'baseline', gap: 4 }]} accessibilityElementsHidden>
        <Text variant={compact ? 'headlineSmall' : 'displaySmall'} style={styles.tabular}>
          {meta.render(reading.values)}
        </Text>
        <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          {reading.unit}
        </Text>
      </View>

      {/* Trend arrow is always paired with a word. */}
      <View style={[styles.row, { gap: 4 }]}>
        <Icon source={trend.icon} size={14} color={health.colors[trend.colorKey]} />
        <Text variant="labelSmall" style={{ color: health.colors[trend.colorKey] }}>
          {trend.label}
        </Text>
      </View>

      {interpretation ? (
        <View
          style={[
            styles.interpretation,
            {
              backgroundColor: theme.colors.surfaceVariant,
              borderRadius: theme.radii.sm,
              padding: theme.spacing.sm,
              gap: 4,
            },
          ]}
        >
          <View style={[styles.row, { gap: 4 }]}>
            <Icon source={interpretation.icon} size={14} color={health.colors[interpretation.colorKey]} />
            <Text variant="labelMedium" style={{ color: health.colors[interpretation.colorKey], flex: 1 }}>
              {interpretation.label}
            </Text>
          </View>
          {reading.interpretationNote ? (
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {reading.interpretationNote}
            </Text>
          ) : null}
        </View>
      ) : null}

      {showReferenceRange && reading.referenceRange ? (
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {reading.referenceRange.label}
          {reading.referenceRange.basis ? ` · ${reading.referenceRange.basis}` : ''}
        </Text>
      ) : null}

      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
        Last measured {formatRelativeDate(reading.measuredAt, locale)}
      </Text>

      <ProvenanceLabel
        provenance={reading.provenance}
        source={reading.source}
        stale={reading.stale}
        staleNote="No recent readings"
        compact={compact}
        testID={childTestID(testID, 'provenance')}
      />

      <View style={[styles.row, { gap: theme.spacing.md, marginTop: 2 }]}>
        {onViewTrend ? (
          <Text
            variant="labelSmall"
            onPress={() => onViewTrend(reading)}
            accessibilityRole="button"
            style={{ color: theme.colors.primary }}
            testID={childTestID(testID, 'trend')}
          >
            View trend
          </Text>
        ) : null}
        {/* Offered whenever a clinician flagged it — never an automated verdict. */}
        {onContactCareTeam && reading.interpretation === 'reviewRequired' ? (
          <Text
            variant="labelSmall"
            onPress={() => onContactCareTeam(reading)}
            accessibilityRole="button"
            style={{ color: theme.colors.primary }}
            testID={childTestID(testID, 'contact')}
          >
            Talk to your care team
          </Text>
        ) : null}
      </View>
    </View>
  );
};

/**
 * Vitals display.
 *
 * The hard rule: this component renders `interpretation` supplied by a clinical
 * rules service and never derives one. There is no threshold table in this file,
 * because reference ranges vary by age, condition, measurement context and local
 * guidance — and a display component is the wrong place to decide any of that.
 */
const VitalsCardBase = forwardRef<View, VitalsCardProps>(function VitalsCard(
  {
    reading,
    readings,
    locale = 'en-IN',
    loading = false,
    compact = false,
    onViewTrend,
    onContactCareTeam,
    onAddReading,
    showReferenceRange = true,
    animated = true,
    entering = false,
    index = 0,
    style,
    containerStyle,
    testID,
  },
  ref,
) {
  const theme = useAppTheme();
  const motion = useMotion({ animated });

  const list = readings ?? (reading ? [reading] : []);

  if (loading) {
    return (
      <AppCard variant="outlined" containerStyle={containerStyle} testID={childTestID(testID, 'loading')}>
        <SkeletonLoader shape="text" lines={1} width="40%" height={12} />
        <SkeletonLoader shape="text" lines={1} width="55%" height={36} containerStyle={{ marginTop: 8 }} />
        <SkeletonLoader shape="text" lines={2} containerStyle={{ marginTop: 8 }} />
      </AppCard>
    );
  }

  if (list.length === 0) {
    return (
      <AppCard variant="outlined" containerStyle={containerStyle} testID={childTestID(testID, 'empty')}>
        <StateView
          preset="empty"
          compact
          title="No readings yet"
          description="No readings in the last 7 days. Add one manually or connect a device."
          primaryAction={onAddReading ? { label: 'Add a reading', onPress: onAddReading } : undefined}
        />
      </AppCard>
    );
  }

  return (
    <Animated.View ref={ref} entering={motion.entering(entering, index)} style={containerStyle}>
      <AppCard variant="outlined" style={style} testID={testID}>
        <View style={{ gap: theme.spacing.lg }}>
          {list.map((item) => (
            <SingleVital
              key={item.id}
              reading={item}
              locale={locale}
              compact={compact || list.length > 1}
              onViewTrend={onViewTrend}
              onContactCareTeam={onContactCareTeam}
              showReferenceRange={showReferenceRange}
              testID={childTestID(testID, item.type)}
            />
          ))}
        </View>

        <View style={{ marginTop: theme.spacing.md }}>
          <NotAdviceNotice
            text="These readings are for your information. They are not a diagnosis. Talk to your care team about anything that concerns you."
            testID={childTestID(testID, 'disclaimer')}
          />
        </View>
      </AppCard>
    </Animated.View>
  );
});

export const VitalsCard = memo(VitalsCardBase);
VitalsCard.displayName = 'VitalsCard';

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  interpretation: {},
  flex: { flex: 1 },
  tabular: { fontVariant: ['tabular-nums'] },
});
