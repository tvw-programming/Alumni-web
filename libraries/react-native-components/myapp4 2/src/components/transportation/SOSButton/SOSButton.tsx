import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, Text, TouchableRipple } from 'react-native-paper';

import { AppButton } from '@ui/atoms/AppButton';
import { AppSheet } from '@ui/organisms/AppSheet';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useRideTheme } from '../theme/transportationTokens';
import type { SafetyContext, SOSVariant } from '../types/domain';

export interface SOSButtonProps extends StyleEscapeHatches {
  context: SafetyContext;
  variant?: SOSVariant;
  onSOS: () => void;
  onShareTrip?: () => void;
  onReport?: () => void;
  onCallSupport?: () => void;
}

/**
 * A Safety Centre, not a one-tap trigger: SOS sits behind a sheet with an
 * explicit confirmation step that states what will happen — live location
 * shared with responders — before anything is called. Trip sharing, incident
 * reporting and support all stay reachable from the same surface throughout
 * an active ride, per the product-level (not merely visual) safety brief.
 */
export const SOSButton = ({ context, variant = 'button', onSOS, onShareTrip, onReport, onCallSupport, style, containerStyle, testID }: SOSButtonProps) => {
  const theme = useAppTheme();
  const ride = useRideTheme();
  const id = testID ?? 'sos-button';
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [calling, setCalling] = useState(false);

  const handleClose = () => {
    setOpen(false);
    setConfirming(false);
  };

  const handleConfirmSOS = () => {
    setCalling(true);
    onSOS();
  };

  const trigger =
    variant === 'icon' ? (
      <TouchableRipple onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel="Safety" style={styles.iconTrigger} testID={id}>
        <Icon source="shield-alert-outline" size={22} color={ride.colors.safety} />
      </TouchableRipple>
    ) : variant === 'menu' ? (
      <TouchableRipple onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel="Safety options" testID={id}>
        <View style={styles.row}>
          <Icon source="shield-alert-outline" size={16} color={ride.colors.safety} />
          <Text variant="labelMedium" style={{ color: ride.colors.safety, marginLeft: 6 }}>
            Safety
          </Text>
        </View>
      </TouchableRipple>
    ) : (
      <AppButton variant="danger" size="md" onPress={() => setOpen(true)} testID={id}>
        Safety
      </AppButton>
    );

  return (
    <>
      {trigger}

      <AppSheet visible={open} onDismiss={handleClose} variant="bottom" title="Safety Centre" scrollable testID={childTestID(id, 'sheet')}>
        <View style={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
          {!confirming ? (
            <>
              <SafetyRow icon="phone-alert-outline" label="Emergency help" description="Call emergency services immediately" onPress={() => setConfirming(true)} tone="danger" testID={childTestID(id, 'sos-entry')} />
              {onShareTrip ? (
                <SafetyRow icon="share-variant-outline" label="Share my trip" description="Send live trip details to a trusted contact" onPress={onShareTrip} testID={childTestID(id, 'share')} />
              ) : null}
              {onReport ? (
                <SafetyRow icon="flag-outline" label="Report a safety issue" description="Tell us what happened, no urgency required" onPress={onReport} testID={childTestID(id, 'report')} />
              ) : null}
              {onCallSupport ? (
                <SafetyRow icon="headset" label="Call support" description={context.safetyTeamAvailable ? 'Our safety team is available now' : 'Support may take longer to respond right now'} onPress={onCallSupport} testID={childTestID(id, 'support')} />
              ) : null}
            </>
          ) : (
            <View style={{ gap: theme.spacing.sm }}>
              <View style={[styles.warnBox, { backgroundColor: ride.colors.safetyContainer, borderRadius: theme.radii.md, padding: theme.spacing.md }]}>
                <Icon source="alert-octagon-outline" size={20} color={ride.colors.onSafetyContainer} />
                <Text variant="titleSmall" style={{ color: ride.colors.onSafetyContainer, marginTop: 6 }}>
                  Are you sure you want to call emergency services?
                </Text>
                <Text variant="bodySmall" style={{ color: ride.colors.onSafetyContainer, marginTop: 4 }}>
                  Your live location will be shared with responders{context.emergencyContacts?.length ? ' and your emergency contacts' : ''}.
                </Text>
              </View>
              <AppButton variant="danger" size="lg" fullWidth loading={calling} onPress={handleConfirmSOS} testID={childTestID(id, 'confirm-sos')}>
                Call emergency services
              </AppButton>
              <AppButton variant="ghost" size="md" fullWidth onPress={() => setConfirming(false)} disabled={calling} testID={childTestID(id, 'cancel-sos')}>
                Never mind
              </AppButton>
            </View>
          )}
        </View>
      </AppSheet>
    </>
  );
};

const SafetyRow = ({
  icon,
  label,
  description,
  onPress,
  tone = 'default',
  testID,
}: {
  icon: string;
  label: string;
  description: string;
  onPress: () => void;
  tone?: 'default' | 'danger';
  testID?: string;
}) => {
  const theme = useAppTheme();
  const ride = useRideTheme();
  const color = tone === 'danger' ? ride.colors.safety : theme.colors.onSurface;
  return (
    <TouchableRipple onPress={onPress} accessibilityRole="button" accessibilityLabel={`${label}. ${description}`} testID={testID}>
      <View style={styles.row}>
        <Icon source={icon} size={20} color={color} />
        <View style={{ marginLeft: 12, flex: 1 }}>
          <Text variant="bodyLarge" style={{ color }}>
            {label}
          </Text>
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {description}
          </Text>
        </View>
      </View>
    </TouchableRipple>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  iconTrigger: { padding: 8 },
  warnBox: {},
});
