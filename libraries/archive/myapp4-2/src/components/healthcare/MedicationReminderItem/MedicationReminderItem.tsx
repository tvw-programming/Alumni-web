import React, { forwardRef, memo, useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Chip, Divider, Icon, Text, TouchableRipple } from 'react-native-paper';
import Animated from 'react-native-reanimated';

import { AppButton } from '@ui/atoms/AppButton';
import { AppSheet } from '@ui/organisms/AppSheet';
import { useMotion, type AnimatableProps } from '@/hooks';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useHealthTheme } from '../theme/healthcareTokens';
import type { MedicationSchedule, MedicationStatus } from '../types/domain';

/**
 * Status presentation. Copy is deliberately neutral — "Missed dose?" invites a
 * correction; "You forgot your medication" shames the user into disengaging.
 */
const STATUS_META: Record<
  MedicationStatus,
  { label: string; icon: string; colorKey: 'medDue' | 'medTaken' | 'medMissed' | 'medSkipped' }
> = {
  upcoming: { label: 'Scheduled', icon: 'clock-outline', colorKey: 'medSkipped' },
  due: { label: 'Due now', icon: 'bell-ring-outline', colorKey: 'medDue' },
  taken: { label: 'Taken', icon: 'check-circle', colorKey: 'medTaken' },
  missed: { label: 'Missed dose?', icon: 'help-circle-outline', colorKey: 'medMissed' },
  skipped: { label: 'Skipped', icon: 'minus-circle-outline', colorKey: 'medSkipped' },
  snoozed: { label: 'Snoozed', icon: 'alarm-snooze', colorKey: 'medDue' },
};

const SKIP_REASONS = [
  'I already took it',
  'I felt unwell after it',
  'I ran out',
  'My clinician told me to stop',
  'Other reason',
];

export interface MedicationReminderItemProps
  extends StyleEscapeHatches,
    Pick<AnimatableProps, 'animated' | 'entering' | 'index'> {
  medication: MedicationSchedule;
  locale?: string;
  onTaken?: (medication: MedicationSchedule) => void;
  onSkip?: (medication: MedicationSchedule, reason: string) => void;
  onSnooze?: (medication: MedicationSchedule, minutes: number) => void;
  onRefill?: (medication: MedicationSchedule) => void;
  onDetails?: (medication: MedicationSchedule) => void;
  /** Notifications are off — the list is then the only reminder that works. */
  notificationsDisabled?: boolean;
  compact?: boolean;
}

/**
 * A single scheduled dose.
 *
 * The checkbox-shaped control marks a dose *taken*; it is not a proxy for
 * medication status, which is why `taken`, `skipped`, `missed` and `snoozed`
 * are separate states with their own copy. No dosing advice is authored here —
 * `safetyNotice` comes from the prescribing system.
 */
const MedicationReminderItemBase = forwardRef<View, MedicationReminderItemProps>(function MedicationReminderItem(
  {
    medication,
    locale = 'en-IN',
    onTaken,
    onSkip,
    onSnooze,
    onRefill,
    onDetails,
    notificationsDisabled = false,
    compact = false,
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
  const health = useHealthTheme();
  const motion = useMotion({ animated });
  const [skipOpen, setSkipOpen] = useState(false);

  const id = testID ?? `med-${medication.medicationId}`;
  const meta = STATUS_META[medication.status];
  const color = health.colors[meta.colorKey];
  const actionable = medication.status === 'due' || medication.status === 'missed' || medication.status === 'snoozed';

  const scheduledLabel = useMemo(
    () => new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(new Date(medication.scheduledAt)),
    [locale, medication.scheduledAt],
  );

  const takenLabel = useMemo(
    () =>
      medication.takenAt
        ? new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(new Date(medication.takenAt))
        : undefined,
    [locale, medication.takenAt],
  );

  const accessibleName = useMemo(
    () =>
      [
        medication.name,
        medication.dose,
        medication.asNeeded ? 'as needed' : `scheduled for ${scheduledLabel}`,
        meta.label,
        takenLabel ? `marked taken at ${takenLabel}` : undefined,
        medication.instructions,
        medication.refillStatus === 'needed' ? 'refill needed' : undefined,
      ]
        .filter(Boolean)
        .join(', '),
    [medication, meta.label, scheduledLabel, takenLabel],
  );

  const handleSkip = useCallback(
    (reason: string) => {
      setSkipOpen(false);
      onSkip?.(medication, reason);
    },
    [medication, onSkip],
  );

  return (
    <Animated.View
      ref={ref}
      entering={motion.entering(entering, index)}
      layout={motion.layout}
      style={[
        {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radii.lg,
          borderWidth: StyleSheet.hairlineWidth * 2,
          borderColor: medication.status === 'due' ? health.colors.medDue : theme.colors.outlineVariant,
          opacity: medication.discontinued ? 0.65 : 1,
          overflow: 'hidden',
        },
        containerStyle,
        style,
      ]}
      testID={id}
    >
      <TouchableRipple
        onPress={onDetails ? () => onDetails(medication) : undefined}
        disabled={!onDetails}
        accessibilityRole={onDetails ? 'button' : 'none'}
        accessibilityLabel={accessibleName}
      >
        <View style={{ padding: theme.spacing.md, gap: theme.spacing.xs }}>
          <View style={[styles.row, { gap: theme.spacing.sm }]}>
            <View
              style={[
                styles.iconWell,
                { backgroundColor: theme.colors.surfaceVariant, borderRadius: theme.radii.pill },
              ]}
            >
              <Icon source="pill" size={20} color={color} />
            </View>

            <View style={styles.flex}>
              <Text variant="titleSmall" numberOfLines={2}>
                {medication.name}
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {medication.dose}
                {medication.form ? ` · ${medication.form}` : ''}
                {medication.route ? ` · ${medication.route}` : ''}
              </Text>
            </View>

            <View style={styles.alignEnd}>
              <Text variant="labelMedium" style={styles.tabular}>
                {medication.asNeeded ? 'As needed' : scheduledLabel}
              </Text>
              {/* Status is icon + word, never colour alone. */}
              <View style={[styles.row, { gap: 2 }]}>
                <Icon source={meta.icon} size={12} color={color} />
                <Text variant="labelSmall" style={{ color }}>
                  {meta.label}
                </Text>
              </View>
            </View>
          </View>

          {medication.instructions ? (
            <View style={[styles.row, { gap: 4 }]}>
              <Icon source="information-outline" size={13} color={theme.colors.onSurfaceVariant} />
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, flex: 1 }}>
                {medication.instructions}
              </Text>
            </View>
          ) : null}

          {takenLabel ? (
            <Text variant="labelSmall" style={{ color: health.colors.medTaken }}>
              Marked taken at {takenLabel}
            </Text>
          ) : null}

          {medication.managedByCaregiver ? (
            <View style={[styles.row, { gap: 4 }]}>
              <Icon source="account-heart-outline" size={13} color={theme.colors.onSurfaceVariant} />
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Managed by your caregiver
              </Text>
            </View>
          ) : null}

          {medication.discontinued ? (
            <Text variant="labelSmall" style={{ color: health.colors.medMissed }}>
              Your clinician has stopped this medication. Do not take further doses.
            </Text>
          ) : null}

          {/* Safety text is passed in from the prescribing system, never authored here. */}
          {medication.safetyNotice ? (
            <View
              style={[
                styles.notice,
                { backgroundColor: theme.colors.surfaceVariant, borderRadius: theme.radii.sm, padding: theme.spacing.sm },
              ]}
            >
              <Icon source="shield-alert-outline" size={14} color={health.colors.statusRequiresAction} />
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 6, flex: 1 }}>
                {medication.safetyNotice}
              </Text>
            </View>
          ) : null}

          {medication.refillStatus && medication.refillStatus !== 'ok' ? (
            <View style={[styles.row, { gap: 4 }]}>
              <Icon source="package-variant" size={13} color={health.colors.refillLow} />
              <Text variant="labelSmall" style={{ color: health.colors.refillLow, flex: 1 }}>
                {medication.refillStatus === 'needed'
                  ? 'Refill needed'
                  : `Running low${medication.refillDaysLeft != null ? ` · about ${medication.refillDaysLeft} days left` : ''}`}
              </Text>
              {onRefill ? (
                <Text
                  variant="labelSmall"
                  onPress={() => onRefill(medication)}
                  accessibilityRole="button"
                  accessibilityLabel={`Request a refill for ${medication.name}`}
                  style={{ color: theme.colors.primary }}
                  testID={childTestID(id, 'refill')}
                >
                  Request refill
                </Text>
              ) : null}
            </View>
          ) : null}

          {notificationsDisabled ? (
            <Text variant="labelSmall" style={{ color: health.colors.statusRequiresAction }}>
              Reminders are off, so this list is your only reminder. Turn notifications on in Settings.
            </Text>
          ) : null}
        </View>
      </TouchableRipple>

      {actionable && !medication.discontinued && !compact ? (
        <>
          <Divider />
          <View style={[styles.actions, { padding: theme.spacing.sm, gap: theme.spacing.sm }]}>
            {onTaken ? (
              <AppButton
                variant="primary"
                size="sm"
                icon="check"
                onPress={() => onTaken(medication)}
                containerStyle={styles.flex}
                accessibilityLabel={`Mark ${medication.name} as taken`}
                testID={childTestID(id, 'taken')}
              >
                Mark taken
              </AppButton>
            ) : null}
            {onSnooze ? (
              <AppButton
                variant="ghost"
                size="sm"
                icon="alarm-snooze"
                onPress={() => onSnooze(medication, 10)}
                accessibilityLabel={`Snooze ${medication.name} for 10 minutes`}
                testID={childTestID(id, 'snooze')}
              >
                Snooze 10 min
              </AppButton>
            ) : null}
            {onSkip ? (
              <AppButton
                variant="ghost"
                size="sm"
                onPress={() => setSkipOpen(true)}
                accessibilityLabel={`Skip this dose of ${medication.name}`}
                testID={childTestID(id, 'skip')}
              >
                Skip
              </AppButton>
            ) : null}
          </View>
        </>
      ) : null}

      <AppSheet
        visible={skipOpen}
        onDismiss={() => setSkipOpen(false)}
        variant="bottom"
        title={`Skip ${medication.name}?`}
        animated={animated}
        testID={childTestID(id, 'skip-sheet')}
      >
        <View style={{ gap: theme.spacing.md }}>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            Telling us why helps your care team. Nothing here changes your prescription.
          </Text>
          <View style={[styles.chips, { gap: theme.spacing.sm }]}>
            {SKIP_REASONS.map((reason) => (
              <Chip key={reason} onPress={() => handleSkip(reason)} testID={childTestID(id, `skip-${reason.slice(0, 6)}`)}>
                {reason}
              </Chip>
            ))}
          </View>
          <AppButton variant="ghost" fullWidth onPress={() => handleSkip('Not given')}>
            Skip without a reason
          </AppButton>
        </View>
      </AppSheet>
    </Animated.View>
  );
});

export const MedicationReminderItem = memo(MedicationReminderItemBase);
MedicationReminderItem.displayName = 'MedicationReminderItem';

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  iconWell: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
  notice: { flexDirection: 'row', alignItems: 'flex-start' },
  alignEnd: { alignItems: 'flex-end' },
  flex: { flex: 1 },
  tabular: { fontVariant: ['tabular-nums'] },
});
