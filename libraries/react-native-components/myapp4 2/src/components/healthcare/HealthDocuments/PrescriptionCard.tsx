import React, { forwardRef, memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Divider, Icon, Text } from 'react-native-paper';
import Animated from 'react-native-reanimated';

import { AppButton } from '@ui/atoms/AppButton';
import { AppCard } from '@ui/molecules/AppCard';
import { useMotion, type AnimatableProps } from '@/hooks';
import { useAppTheme } from '@/theme';
import { childTestID, formatRelativeDate } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useHealthTheme } from '../theme/healthcareTokens';
import type { Prescription } from '../types/domain';

const STATUS_META = {
  active: { label: 'Active', icon: 'check-circle-outline', colorKey: 'statusReady' as const },
  completed: { label: 'Completed', icon: 'flag-checkered', colorKey: 'statusCompleted' as const },
  expired: { label: 'Expired', icon: 'calendar-remove-outline', colorKey: 'statusCanceled' as const },
  refillAvailable: { label: 'Refill available', icon: 'package-variant', colorKey: 'statusUpcoming' as const },
  refillRequested: { label: 'Refill requested', icon: 'progress-clock', colorKey: 'statusRequiresAction' as const },
};

export interface PrescriptionCardProps extends StyleEscapeHatches, Pick<AnimatableProps, 'animated' | 'entering' | 'index'> {
  prescription: Prescription;
  locale?: string;
  onRequestRefill?: (prescription: Prescription) => void;
  onViewDocument?: (prescription: Prescription) => void;
  onFindPharmacy?: (prescription: Prescription) => void;
  refillPending?: boolean;
}

/** A prescription, including multi-medication ones as a single record. */
const PrescriptionCardBase = forwardRef<View, PrescriptionCardProps>(function PrescriptionCard(
  {
    prescription,
    locale = 'en-IN',
    onRequestRefill,
    onViewDocument,
    onFindPharmacy,
    refillPending = false,
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

  const id = testID ?? `rx-${prescription.id}`;
  const meta = STATUS_META[prescription.status];
  const color = health.colors[meta.colorKey];
  const canRefill = prescription.status === 'refillAvailable' && !!onRequestRefill;

  const accessibleName = useMemo(
    () =>
      [
        `Prescription from ${prescription.prescribedBy}`,
        formatRelativeDate(prescription.prescribedAt, locale),
        `${prescription.medications.length} medication${prescription.medications.length === 1 ? '' : 's'}`,
        meta.label,
      ].join(', '),
    [locale, meta.label, prescription],
  );

  return (
    <Animated.View ref={ref} entering={motion.entering(entering, index)} style={containerStyle} testID={id}>
      <AppCard variant="outlined" style={style} accessibilityLabel={accessibleName}>
        <View style={[styles.row, { gap: theme.spacing.sm }]}>
          <View style={styles.flex}>
            <Text variant="titleSmall">{prescription.prescribedBy}</Text>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Prescribed {formatRelativeDate(prescription.prescribedAt, locale)}
            </Text>
          </View>
          <View style={[styles.row, { gap: 3 }]}>
            <Icon source={meta.icon} size={13} color={color} />
            <Text variant="labelSmall" style={{ color }}>
              {meta.label}
            </Text>
          </View>
        </View>

        <Divider style={{ marginVertical: theme.spacing.sm }} />

        <View style={{ gap: theme.spacing.sm }}>
          {prescription.medications.map((medication) => (
            <View key={medication.name} style={{ gap: 2 }}>
              <Text variant="bodyMedium">
                {medication.name} · {medication.dose}
              </Text>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {medication.frequency}
                {medication.duration ? ` · ${medication.duration}` : ''}
              </Text>
              {medication.instructions ? (
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {medication.instructions}
                </Text>
              ) : null}
            </View>
          ))}
        </View>

        {prescription.refillsRemaining != null ? (
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: theme.spacing.sm }}>
            {prescription.refillsRemaining} refill{prescription.refillsRemaining === 1 ? '' : 's'} remaining
          </Text>
        ) : null}

        {prescription.expiresAt ? (
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            Valid until {new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(prescription.expiresAt))}
          </Text>
        ) : null}

        {prescription.pharmacy ? (
          <View style={[styles.row, { gap: 4, marginTop: theme.spacing.xs }]}>
            <Icon
              source={prescription.pharmacy.available ? 'store-check-outline' : 'store-alert-outline'}
              size={13}
              color={prescription.pharmacy.available ? health.colors.statusReady : health.colors.statusRequiresAction}
            />
            <Text
              variant="labelSmall"
              style={{
                color: prescription.pharmacy.available ? theme.colors.onSurfaceVariant : health.colors.statusRequiresAction,
                flex: 1,
              }}
            >
              {prescription.pharmacy.name}
              {prescription.pharmacy.available ? '' : ' — not accepting orders right now'}
            </Text>
          </View>
        ) : null}

        <View style={[styles.actions, { gap: theme.spacing.sm, marginTop: theme.spacing.md }]}>
          {canRefill ? (
            <AppButton
              variant="primary"
              size="sm"
              icon="package-variant"
              loading={refillPending}
              debounceMs={1000}
              onPress={() => onRequestRefill(prescription)}
              containerStyle={styles.flex}
              testID={childTestID(id, 'refill')}
            >
              Request refill
            </AppButton>
          ) : null}
          {onViewDocument ? (
            <AppButton
              variant="secondary"
              size="sm"
              icon="file-document-outline"
              onPress={() => onViewDocument(prescription)}
              testID={childTestID(id, 'view')}
            >
              View prescription
            </AppButton>
          ) : null}
          {onFindPharmacy && prescription.pharmacy && !prescription.pharmacy.available ? (
            <AppButton variant="ghost" size="sm" onPress={() => onFindPharmacy(prescription)}>
              Find another pharmacy
            </AppButton>
          ) : null}
        </View>
      </AppCard>
    </Animated.View>
  );
});

export const PrescriptionCard = memo(PrescriptionCardBase);
PrescriptionCard.displayName = 'PrescriptionCard';

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  flex: { flex: 1 },
});
