import React, { forwardRef, memo, useMemo } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Avatar, Chip, Icon, IconButton, Text, TouchableRipple } from 'react-native-paper';
import Animated from 'react-native-reanimated';

import { AppButton } from '@ui/atoms/AppButton';
import { RatingStars } from '@ui/atoms/RatingStars';
import { SkeletonLoader } from '@ui/atoms/Skeleton';
import { formatMoney } from '@ui/primitives/money';
import { useMotion, usePressAnimation, type AnimatableProps } from '@/hooks';
import { useAppTheme } from '@/theme';
import { childTestID, initialsOf } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useHealthTheme } from '../theme/healthcareTokens';
import type { ConsultationMode, Doctor } from '../types/domain';

export type DoctorCardVariant = 'search' | 'featured' | 'compact' | 'unavailable';

const MODE_META: Record<ConsultationMode, { label: string; icon: string }> = {
  video: { label: 'Video', icon: 'video-outline' },
  audio: { label: 'Phone', icon: 'phone-outline' },
  inPerson: { label: 'In person', icon: 'hospital-building' },
};

export interface DoctorCardProps extends StyleEscapeHatches, Pick<AnimatableProps, 'animated' | 'entering' | 'index'> {
  doctor: Doctor;
  variant?: DoctorCardVariant;
  locale?: string;
  loading?: boolean;
  favorite?: boolean;
  /** Pre-formatted by the caller — time-zone conversion is not this card's job. */
  nextAvailableLabel?: string;
  /** Whose appointment this would be, when booking for a dependant. */
  patientContextLabel?: string;
  onViewProfile?: (doctor: Doctor) => void;
  onBook?: (doctor: Doctor, mode: ConsultationMode) => void;
  onFavorite?: (doctor: Doctor, next: boolean) => void;
  /** Slots. */
  badges?: React.ReactNode;
  metadata?: React.ReactNode;
  actions?: React.ReactNode;
}

/**
 * Provider discovery card.
 *
 * Two deliberate constraints: the rating is labelled as *patient feedback* with
 * its count visible — a star average is not a clinical quality measure and must
 * not read like one — and the fee/insurance line never claims a price the
 * eligibility service has not confirmed.
 */
const DoctorCardBase = forwardRef<View, DoctorCardProps>(function DoctorCard(
  {
    doctor,
    variant = 'search',
    locale = 'en-IN',
    loading = false,
    favorite = false,
    nextAvailableLabel,
    patientContextLabel,
    onViewProfile,
    onBook,
    onFavorite,
    badges,
    metadata,
    actions,
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
  const { animatedStyle, onPressIn, onPressOut } = usePressAnimation({
    animation: onViewProfile ? 'scale' : 'none',
    animated,
    scaleTo: 0.98,
  });

  const id = testID ?? `doctor-${doctor.id}`;
  const compact = variant === 'compact';
  const unavailable = variant === 'unavailable' || (!doctor.nextAvailable && !nextAvailableLabel);

  const availabilityText = useMemo(() => {
    if (nextAvailableLabel) return nextAvailableLabel;
    if (!doctor.nextAvailable) return 'No appointments available';
    return `Next available ${new Intl.DateTimeFormat(locale, {
      weekday: 'short',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(doctor.nextAvailable))}`;
  }, [doctor.nextAvailable, locale, nextAvailableLabel]);

  const insuranceCopy = useMemo(() => {
    switch (doctor.insuranceStatus) {
      case 'accepted':
        return { text: 'Accepts your insurance', icon: 'shield-check-outline', color: health.colors.rangeUsual };
      case 'notAccepted':
        return { text: 'Does not accept your insurance', icon: 'shield-off-outline', color: health.colors.rangeOutside };
      case 'checking':
        return { text: 'Checking your insurance…', icon: 'shield-search', color: health.colors.provenanceUnknown };
      default:
        // Never imply coverage that has not been confirmed.
        return { text: 'Insurance not confirmed', icon: 'shield-alert-outline', color: health.colors.provenanceUnknown };
    }
  }, [doctor.insuranceStatus, health.colors]);

  /** One composed name so the card reads as a sentence to a screen reader. */
  const accessibleName = useMemo(() => {
    const parts = [
      `${doctor.name}${doctor.credentials ? `, ${doctor.credentials}` : ''}`,
      doctor.specialty,
      doctor.rating ? `patient rating ${doctor.rating.average} out of 5 from ${doctor.rating.count} reviews` : undefined,
      doctor.fee ? `consultation fee ${formatMoney(doctor.fee, { locale })}` : undefined,
      availabilityText,
      doctor.acceptingNewPatients === false ? 'Not accepting new patients' : undefined,
    ];
    return parts.filter(Boolean).join(', ');
  }, [availabilityText, doctor, locale]);

  if (loading) {
    return (
      <View
        style={[
          styles.card,
          { backgroundColor: theme.colors.surface, borderRadius: theme.radii.lg, padding: theme.spacing.md },
          containerStyle,
        ]}
        testID={childTestID(id, 'skeleton')}
      >
        <View style={[styles.row, { gap: theme.spacing.md }]}>
          <SkeletonLoader shape="circle" height={health.layout.avatarSize} />
          <View style={styles.flex}>
            <SkeletonLoader shape="text" lines={2} />
          </View>
        </View>
        <SkeletonLoader shape="text" lines={1} height={36} containerStyle={{ marginTop: theme.spacing.md }} />
      </View>
    );
  }

  return (
    <Animated.View
      ref={ref}
      entering={motion.entering(entering, index)}
      layout={motion.layout}
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radii.lg,
          borderWidth: StyleSheet.hairlineWidth * 2,
          borderColor: theme.colors.outlineVariant,
        },
        containerStyle,
        animatedStyle,
        style,
      ]}
      testID={id}
    >
      <TouchableRipple
        onPress={onViewProfile ? () => onViewProfile(doctor) : undefined}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={!onViewProfile}
        accessibilityRole={onViewProfile ? 'link' : 'none'}
        accessibilityLabel={accessibleName}
        accessibilityHint={onViewProfile ? 'Opens the full profile' : undefined}
        borderless
        testID={childTestID(id, 'profile-link')}
      >
        <View style={{ padding: theme.spacing.md }}>
          {patientContextLabel ? (
            <Text variant="labelSmall" style={{ color: health.colors.onSurfaceCalm, marginBottom: theme.spacing.xs }}>
              For {patientContextLabel}
            </Text>
          ) : null}

          <View style={[styles.row, { gap: theme.spacing.md }]}>
            {doctor.avatar?.uri ? (
              <Image
                source={{ uri: doctor.avatar.uri }}
                style={{ width: health.layout.avatarSize, height: health.layout.avatarSize, borderRadius: theme.radii.pill }}
                // The card's composed label already names the clinician.
                accessibilityElementsHidden
              />
            ) : (
              // Initials, never a stock medical photo that could imply identity.
              <Avatar.Text size={health.layout.avatarSize} label={initialsOf(doctor.name)} />
            )}

            <View style={styles.flex}>
              <View style={[styles.row, { gap: 4 }]}>
                <Text variant="titleSmall" numberOfLines={2} style={styles.flex}>
                  {doctor.name}
                  {doctor.credentials ? `, ${doctor.credentials}` : ''}
                </Text>
                {doctor.verification === 'verified' ? (
                  <Icon source="check-decagram" size={16} color={health.colors.provenanceClinician} />
                ) : null}
              </View>

              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
                {doctor.specialty}
                {doctor.subSpecialty ? ` · ${doctor.subSpecialty}` : ''}
              </Text>

              {doctor.experienceYears ? (
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {doctor.experienceYears} years experience
                </Text>
              ) : null}

              {doctor.rating ? (
                <View style={[styles.row, { gap: 4, marginTop: 2 }]}>
                  <RatingStars value={doctor.rating.average} readonly allowHalf size="sm" entering={false} />
                  {/* Explicitly framed as patient feedback, with the count. */}
                  <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    {doctor.rating.average.toFixed(1)} ·{' '}
                    {doctor.rating.count < 10
                      ? `only ${doctor.rating.count} patient reviews`
                      : `${doctor.rating.count} patient reviews`}
                  </Text>
                </View>
              ) : null}
            </View>

            {onFavorite ? (
              <IconButton
                icon={favorite ? 'heart' : 'heart-outline'}
                size={20}
                onPress={() => onFavorite(doctor, !favorite)}
                accessibilityLabel={favorite ? `Remove ${doctor.name} from favourites` : `Save ${doctor.name} to favourites`}
                accessibilityState={{ selected: favorite }}
                testID={childTestID(id, 'favorite')}
              />
            ) : null}
          </View>

          {badges ?? (
            <View style={[styles.chips, { gap: theme.spacing.xs, marginTop: theme.spacing.sm }]}>
              {doctor.consultationModes.map((mode) => (
                <Chip key={mode} compact icon={MODE_META[mode].icon} testID={childTestID(id, `mode-${mode}`)}>
                  {MODE_META[mode].label}
                </Chip>
              ))}
              {doctor.acceptingNewPatients === false ? (
                <Chip compact icon="account-off-outline">
                  Not accepting new patients
                </Chip>
              ) : null}
              {doctor.languages?.length ? (
                <Chip compact icon="translate">
                  {doctor.languages.slice(0, 2).join(', ')}
                </Chip>
              ) : null}
            </View>
          )}

          {metadata ?? (
            <View style={{ marginTop: theme.spacing.sm, gap: 2 }}>
              <View style={[styles.row, { gap: 4 }]}>
                <Icon source={insuranceCopy.icon} size={14} color={insuranceCopy.color} />
                <Text variant="labelSmall" style={{ color: insuranceCopy.color }}>
                  {insuranceCopy.text}
                </Text>
              </View>

              {doctor.fee ? (
                <Text variant="labelMedium" style={styles.tabular}>
                  {formatMoney(doctor.fee, { locale })}
                  {doctor.insuranceStatus === 'checking' ? ' (before insurance)' : ''}
                </Text>
              ) : (
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Fee available after you select insurance
                </Text>
              )}

              {doctor.locations?.length ? (
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
                  {doctor.locations[0]?.name}
                  {doctor.locations.length > 1 ? ` +${doctor.locations.length - 1} more locations` : ''}
                </Text>
              ) : null}

              <View style={[styles.row, { gap: 4, marginTop: 2 }]}>
                <Icon
                  source={unavailable ? 'calendar-remove-outline' : 'calendar-check-outline'}
                  size={14}
                  color={unavailable ? theme.colors.onSurfaceVariant : health.colors.statusReady}
                />
                <Text
                  variant="labelMedium"
                  style={{ color: unavailable ? theme.colors.onSurfaceVariant : health.colors.statusReady }}
                >
                  {availabilityText}
                </Text>
              </View>
            </View>
          )}
        </View>
      </TouchableRipple>

      <View style={{ paddingHorizontal: theme.spacing.md, paddingBottom: theme.spacing.md }}>
        {actions ?? (
          <View style={[styles.actions, { gap: theme.spacing.sm }]}>
            {onViewProfile ? (
              <AppButton
                variant="secondary"
                size={compact ? 'sm' : 'md'}
                onPress={() => onViewProfile(doctor)}
                containerStyle={styles.flex}
                testID={childTestID(id, 'view-profile')}
              >
                View profile
              </AppButton>
            ) : null}
            {onBook ? (
              <AppButton
                variant="primary"
                size={compact ? 'sm' : 'md'}
                disabled={unavailable}
                onPress={() => onBook(doctor, doctor.consultationModes[0] ?? 'inPerson')}
                containerStyle={styles.flex}
                testID={childTestID(id, 'book')}
              >
                {unavailable ? 'No times' : 'See available times'}
              </AppButton>
            ) : null}
          </View>
        )}
      </View>
    </Animated.View>
  );
});

export const DoctorCard = memo(DoctorCardBase);
DoctorCard.displayName = 'DoctorCard';

const styles = StyleSheet.create({
  card: { overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  actions: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  tabular: { fontVariant: ['tabular-nums'] },
});
