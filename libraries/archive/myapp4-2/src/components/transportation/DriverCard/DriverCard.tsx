import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Avatar, Icon, Text, TouchableRipple } from 'react-native-paper';

import { AppCard } from '@ui/molecules/AppCard';
import { useAppTheme } from '@/theme';
import { childTestID, initialsOf } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useRideTheme } from '../theme/transportationTokens';
import type { Driver } from '../types/domain';

export interface DriverCardProps extends StyleEscapeHatches {
  driver: Driver;
  showVehicle?: boolean;
  showContactActions?: boolean;
  showSafetyAction?: boolean;
  onCall?: () => void;
  onChat?: () => void;
  onShare?: () => void;
  onSafety?: () => void;
  onExplainVerification?: () => void;
}

/**
 * The vehicle plate is prominent, but never the only confirmation offered —
 * make, model and colour render alongside it. Contact buttons route through a
 * masked relay by convention (the caller wires the actual call/chat), and the
 * component never surfaces a raw phone number.
 */
export const DriverCard = ({
  driver,
  showVehicle = true,
  showContactActions = true,
  showSafetyAction = false,
  onCall,
  onChat,
  onShare,
  onSafety,
  onExplainVerification,
  style,
  containerStyle,
  testID,
}: DriverCardProps) => {
  const theme = useAppTheme();
  const ride = useRideTheme();
  const id = testID ?? `driver-${driver.id}`;
  const contactBlocked = driver.phoneContact === 'unavailable';

  return (
    <AppCard variant="outlined" containerStyle={containerStyle} style={style} testID={id}>
      <View style={{ gap: theme.spacing.sm }}>
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
          Your driver
        </Text>

        <View style={styles.row}>
          {driver.avatar?.uri ? (
            <Avatar.Image size={ride.layout.driverAvatarSize} source={{ uri: driver.avatar.uri }} />
          ) : (
            <Avatar.Text size={ride.layout.driverAvatarSize} label={initialsOf(driver.name)} />
          )}

          <View style={[styles.flex, { marginLeft: theme.spacing.sm }]}>
            <View style={styles.row}>
              <Text variant="titleMedium" numberOfLines={1} style={styles.flex}>
                {driver.name}
              </Text>
              {driver.verificationStatus === 'verified' ? (
                <TouchableRipple
                  onPress={onExplainVerification}
                  disabled={!onExplainVerification}
                  accessibilityRole={onExplainVerification ? 'button' : undefined}
                  accessibilityLabel="Verified driver. Activate for details."
                >
                  <View style={styles.row}>
                    <Icon source="shield-check" size={13} color={ride.colors.verified} />
                    <Text variant="labelSmall" style={{ color: ride.colors.verified, marginLeft: 3 }}>
                      Verified
                    </Text>
                  </View>
                </TouchableRipple>
              ) : null}
            </View>

            {driver.rating != null ? (
              <View style={styles.row}>
                <Icon source="star" size={13} color={ride.colors.ratingFill} />
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 3 }}>
                  {driver.rating.toFixed(1)}
                  {driver.ratingCount ? ` (${driver.ratingCount})` : ''}
                </Text>
              </View>
            ) : null}

            {driver.eta ? (
              <Text variant="labelSmall" style={{ color: ride.colors.statusArriving, marginTop: 2 }}>
                Driver arriving in {driver.eta}
              </Text>
            ) : null}
          </View>
        </View>

        {showVehicle ? (
          <View
            style={[styles.vehicleRow, { backgroundColor: theme.colors.surfaceVariant, borderRadius: theme.radii.sm, padding: theme.spacing.sm }]}
            accessibilityRole="text"
            accessibilityLabel={`Vehicle: ${[driver.vehicle.color, driver.vehicle.make, driver.vehicle.model].filter(Boolean).join(' ')}, plate ${driver.vehicle.plateNumber}`}
          >
            <Icon source="car" size={18} color={theme.colors.onSurfaceVariant} />
            <View style={{ marginLeft: 8 }}>
              <Text variant="bodyMedium">
                {[driver.vehicle.color, driver.vehicle.make, driver.vehicle.model].filter(Boolean).join(' ')}
              </Text>
              <Text variant="titleSmall" style={styles.plate}>
                {driver.vehicle.plateNumber}
              </Text>
            </View>
          </View>
        ) : null}

        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
          Verify the vehicle before entering.
        </Text>

        {showContactActions ? (
          <View style={[styles.row, { gap: theme.spacing.sm }]}>
            {onChat ? (
              <TouchableRipple
                onPress={onChat}
                disabled={contactBlocked}
                accessibilityRole="button"
                accessibilityLabel="Message driver"
                style={[styles.actionButton, { borderColor: theme.colors.outlineVariant, opacity: contactBlocked ? 0.5 : 1 }]}
                testID={childTestID(id, 'chat')}
              >
                <View style={styles.row}>
                  <Icon source="message-outline" size={16} color={theme.colors.primary} />
                  <Text variant="labelMedium" style={{ color: theme.colors.primary, marginLeft: 6 }}>
                    Message driver
                  </Text>
                </View>
              </TouchableRipple>
            ) : null}
            {onCall ? (
              <TouchableRipple
                onPress={onCall}
                disabled={contactBlocked}
                accessibilityRole="button"
                accessibilityLabel="Call driver, number is masked"
                style={[styles.actionButton, { borderColor: theme.colors.outlineVariant, opacity: contactBlocked ? 0.5 : 1 }]}
                testID={childTestID(id, 'call')}
              >
                <View style={styles.row}>
                  <Icon source="phone-outline" size={16} color={theme.colors.primary} />
                  <Text variant="labelMedium" style={{ color: theme.colors.primary, marginLeft: 6 }}>
                    Call driver
                  </Text>
                </View>
              </TouchableRipple>
            ) : null}
          </View>
        ) : null}

        {contactBlocked ? (
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            Contact is unavailable for this trip.
          </Text>
        ) : null}

        {(onShare || (showSafetyAction && onSafety)) ? (
          <View style={[styles.row, { gap: theme.spacing.md }]}>
            {onShare ? (
              <TouchableRipple onPress={onShare} accessibilityRole="button" accessibilityLabel="Share trip" testID={childTestID(id, 'share')}>
                <Text variant="labelMedium" style={{ color: theme.colors.primary }}>
                  Share trip
                </Text>
              </TouchableRipple>
            ) : null}
            {showSafetyAction && onSafety ? (
              <TouchableRipple onPress={onSafety} accessibilityRole="button" accessibilityLabel="Safety" testID={childTestID(id, 'safety')}>
                <Text variant="labelMedium" style={{ color: ride.colors.safety }}>
                  Safety
                </Text>
              </TouchableRipple>
            ) : null}
          </View>
        ) : null}
      </View>
    </AppCard>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  vehicleRow: { flexDirection: 'row', alignItems: 'center' },
  plate: { letterSpacing: 1 },
  actionButton: { flex: 1, borderWidth: StyleSheet.hairlineWidth, borderRadius: 20, paddingVertical: 8, alignItems: 'center' },
});
