import React, { forwardRef, memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Avatar, Divider, Icon, Text, TouchableRipple } from 'react-native-paper';
import Animated from 'react-native-reanimated';

import { AppButton } from '@ui/atoms/AppButton';
import { useMotion, type AnimatableProps } from '@/hooks';
import { useAppTheme } from '@/theme';
import { childTestID, initialsOf } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useHealthTheme } from '../theme/healthcareTokens';
import type { Appointment, AppointmentAction, AppointmentStatus, ConsultationMode } from '../types/domain';

const MODE_META: Record<ConsultationMode, { label: string; icon: string }> = {
  video: { label: 'Video visit', icon: 'video-outline' },
  audio: { label: 'Phone visit', icon: 'phone-outline' },
  inPerson: { label: 'In person', icon: 'hospital-building' },
};

/**
 * Status presentation. Note that "today" is not a status and gets no alarming
 * treatment — a scheduled appointment happening today is normal, not an alert.
 */
const STATUS_META: Record<
  AppointmentStatus,
  { label: string; icon: string; colorKey: 'statusUpcoming' | 'statusReady' | 'statusInProgress' | 'statusCompleted' | 'statusCanceled' | 'statusNoShow' | 'statusRequiresAction' }
> = {
  upcoming: { label: 'Upcoming', icon: 'calendar-clock', colorKey: 'statusUpcoming' },
  checkInRequired: { label: 'Check-in required', icon: 'clipboard-edit-outline', colorKey: 'statusRequiresAction' },
  ready: { label: 'Ready to join', icon: 'video-check-outline', colorKey: 'statusReady' },
  inProgress: { label: 'In progress', icon: 'record-circle-outline', colorKey: 'statusInProgress' },
  completed: { label: 'Completed', icon: 'check-circle-outline', colorKey: 'statusCompleted' },
  canceled: { label: 'Canceled', icon: 'close-circle-outline', colorKey: 'statusCanceled' },
  rescheduled: { label: 'Rescheduled', icon: 'calendar-refresh-outline', colorKey: 'statusRequiresAction' },
  noShow: { label: 'Missed', icon: 'calendar-remove-outline', colorKey: 'statusNoShow' },
};

export interface AppointmentCardProps extends StyleEscapeHatches, Pick<AnimatableProps, 'animated' | 'entering' | 'index'> {
  appointment: Appointment;
  locale?: string;
  /** Emphasises the card without using alarm colours. */
  isToday?: boolean;
  actions?: AppointmentAction[];
  onPress?: (appointment: Appointment) => void;
  onJoin?: (appointment: Appointment) => void;
  onCheckIn?: (appointment: Appointment) => void;
  onAddToCalendar?: (appointment: Appointment) => void;
  compact?: boolean;
}

export const StatusChip = ({ status, testID }: { status: AppointmentStatus; testID?: string }) => {
  const theme = useAppTheme();
  const health = useHealthTheme();
  const meta = STATUS_META[status];
  const color = health.colors[meta.colorKey];

  return (
    <View
      style={[
        styles.chip,
        { borderColor: color, borderRadius: theme.radii.pill, paddingHorizontal: theme.spacing.xs },
      ]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`Status: ${meta.label}`}
      testID={testID}
    >
      {/* Icon + word — status is never colour alone. */}
      <Icon source={meta.icon} size={12} color={color} />
      <Text variant="labelSmall" style={{ color, marginLeft: 4 }}>
        {meta.label}
      </Text>
    </View>
  );
};

/**
 * A scheduled or past visit.
 *
 * `joinEligible` is supplied by a visit service — this card never decides on its
 * own that a video visit can be joined, because "the clock says 10:00" and "the
 * room is open" are different facts.
 */
const AppointmentCardBase = forwardRef<View, AppointmentCardProps>(function AppointmentCard(
  {
    appointment,
    locale = 'en-IN',
    isToday = false,
    actions,
    onPress,
    onJoin,
    onCheckIn,
    onAddToCalendar,
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

  const id = testID ?? `appointment-${appointment.id}`;
  const meta = STATUS_META[appointment.status];
  const modeMeta = MODE_META[appointment.mode];
  const past = appointment.status === 'completed' || appointment.status === 'canceled' || appointment.status === 'noShow';

  const when = useMemo(() => {
    const start = new Date(appointment.start);
    const day = new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short' }).format(start);
    const time = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(start);
    return { day: isToday ? 'Today' : day, time };
  }, [appointment.start, isToday, locale]);

  const accessibleName = useMemo(
    () =>
      [
        appointment.patientName ? `Appointment for ${appointment.patientName}` : 'Your appointment',
        `${when.day} at ${when.time}`,
        modeMeta.label,
        `with ${appointment.clinician.name}`,
        appointment.clinician.specialty,
        meta.label,
        appointment.delayNotice,
      ]
        .filter(Boolean)
        .join(', '),
    [appointment, meta.label, modeMeta.label, when],
  );

  // The join control only appears when the visit service says the room is open.
  const canJoin = appointment.status === 'ready' && appointment.joinEligible !== false && !!onJoin;
  const needsCheckIn = appointment.status === 'checkInRequired' && !!onCheckIn;

  return (
    <Animated.View
      ref={ref}
      entering={motion.entering(entering, index)}
      layout={motion.layout}
      style={[
        {
          backgroundColor: isToday ? health.colors.surfaceCalm : theme.colors.surface,
          borderRadius: theme.radii.lg,
          borderWidth: StyleSheet.hairlineWidth * 2,
          borderColor: isToday ? health.colors.statusUpcoming : theme.colors.outlineVariant,
          opacity: past ? 0.9 : 1,
          overflow: 'hidden',
        },
        containerStyle,
        style,
      ]}
      testID={id}
    >
      <TouchableRipple
        onPress={onPress ? () => onPress(appointment) : undefined}
        disabled={!onPress}
        accessibilityRole={onPress ? 'button' : 'none'}
        accessibilityLabel={accessibleName}
        testID={childTestID(id, 'details-link')}
      >
        <View style={{ padding: theme.spacing.md, gap: theme.spacing.xs }}>
          <View style={[styles.row, { gap: theme.spacing.sm }]}>
            <View style={styles.flex}>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {appointment.patientName ? `For ${appointment.patientName}` : 'Your appointment'}
              </Text>
              <Text variant="titleMedium" style={styles.tabular}>
                {when.day} · {when.time}
              </Text>
            </View>
            <StatusChip status={appointment.status} testID={childTestID(id, 'status')} />
          </View>

          <View style={[styles.row, { gap: theme.spacing.sm, marginTop: theme.spacing.xs }]}>
            <Avatar.Text size={36} label={initialsOf(appointment.clinician.name)} />
            <View style={styles.flex}>
              <Text variant="bodyMedium" numberOfLines={1}>
                {appointment.clinician.name}
              </Text>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
                {appointment.clinician.specialty}
                {appointment.reason ? ` · ${appointment.reason}` : ''}
              </Text>
            </View>
          </View>

          <View style={[styles.row, { gap: 4, marginTop: 2 }]}>
            <Icon source={modeMeta.icon} size={14} color={theme.colors.onSurfaceVariant} />
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={2}>
              {modeMeta.label}
              {appointment.location ? ` · ${appointment.location.name}` : ''}
            </Text>
          </View>

          {appointment.delayNotice ? (
            <View style={[styles.row, { gap: 4 }]}>
              <Icon source="clock-alert-outline" size={14} color={health.colors.statusRequiresAction} />
              <Text variant="labelSmall" style={{ color: health.colors.statusRequiresAction, flex: 1 }}>
                {appointment.delayNotice}
              </Text>
            </View>
          ) : null}

          {appointment.status === 'canceled' && appointment.cancellationReason ? (
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {appointment.cancellationReason}
            </Text>
          ) : null}

          {appointment.paymentPending ? (
            <View style={[styles.row, { gap: 4 }]}>
              <Icon source="credit-card-clock-outline" size={14} color={health.colors.statusRequiresAction} />
              <Text variant="labelSmall" style={{ color: health.colors.statusRequiresAction }}>
                Payment pending
              </Text>
            </View>
          ) : null}
        </View>
      </TouchableRipple>

      {!compact ? (
        <>
          <Divider />
          <View style={[styles.actions, { padding: theme.spacing.sm, gap: theme.spacing.sm }]}>
            {canJoin ? (
              <AppButton
                variant="primary"
                size="sm"
                icon="video"
                onPress={() => onJoin?.(appointment)}
                containerStyle={styles.flex}
                testID={childTestID(id, 'join')}
              >
                Join waiting room
              </AppButton>
            ) : null}

            {needsCheckIn ? (
              <AppButton
                variant="primary"
                size="sm"
                icon="clipboard-edit-outline"
                onPress={() => onCheckIn?.(appointment)}
                containerStyle={styles.flex}
                testID={childTestID(id, 'check-in')}
              >
                Complete check-in
              </AppButton>
            ) : null}

            {appointment.status === 'canceled' ? (
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, flex: 1 }}>
                This appointment was canceled. Choose a new time to rebook.
              </Text>
            ) : null}

            {onAddToCalendar && !past ? (
              <AppButton
                variant="ghost"
                size="sm"
                icon="calendar-plus"
                onPress={() => onAddToCalendar(appointment)}
                accessibilityLabel="Add this appointment to your calendar"
                testID={childTestID(id, 'calendar')}
              >
                Add to calendar
              </AppButton>
            ) : null}

            {actions?.map((action) => (
              <AppButton
                key={action.key}
                variant={action.destructive ? 'danger' : 'ghost'}
                size="sm"
                icon={action.icon}
                disabled={action.disabled}
                onPress={action.onPress}
                testID={childTestID(id, `action-${action.key}`)}
              >
                {action.label}
              </AppButton>
            ))}
          </View>
        </>
      ) : null}
    </Animated.View>
  );
});

export const AppointmentCard = memo(AppointmentCardBase);
AppointmentCard.displayName = 'AppointmentCard';

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, paddingVertical: 2 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  flex: { flex: 1 },
  tabular: { fontVariant: ['tabular-nums'] },
});
