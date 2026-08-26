import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, Text, TouchableRipple } from 'react-native-paper';

import { AppButton } from '@ui/atoms/AppButton';
import { AppCard } from '@ui/molecules/AppCard';
import { StateView } from '@ui/molecules/StateView';
import { useConfirm } from '@ui/providers/ConfirmProvider';
import { useAppTheme } from '@/theme';
import { childTestID, formatRelativeDate } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useHealthTheme } from '../theme/healthcareTokens';
import type { EmergencyContact, EmergencyServices } from '../types/domain';

/** Masks the middle of a number for on-screen display. */
export const maskPhone = (phone: string): string => {
  const digits = phone.replace(/[^\d+]/g, '');
  if (digits.length < 6) return phone;
  return `${digits.slice(0, digits.length - 4).replace(/\d(?=\d{2})/g, '•')}${digits.slice(-4)}`;
};

export interface EmergencyContactCardProps extends StyleEscapeHatches {
  contacts: EmergencyContact[];
  /** Locale-aware emergency number. Never hardcoded to one country. */
  emergencyServices: EmergencyServices;
  locale?: string;
  /**
   * Calling is routed through a controlled service so numbers never reach
   * analytics or logs.
   */
  onCallContact: (contact: EmergencyContact) => void;
  onCallEmergencyServices: () => void;
  onEdit?: (contact: EmergencyContact) => void;
  onAdd?: () => void;
  onVerify?: (contact: EmergencyContact) => void;
  /** Show masked numbers only. */
  maskNumbers?: boolean;
  offline?: boolean;
  /** Extra crisis-support route, where the product offers one. */
  crisisSupport?: { label: string; description?: string; onPress: () => void };
}

/**
 * Emergency contacts and escalation.
 *
 * Two safety rules are structural here: calling a personal contact asks for
 * confirmation (a mis-tap should not ring someone's mother at 3am), while the
 * emergency-services action does not — adding friction to a real emergency is
 * the more dangerous failure. And the copy never implies the app can dispatch
 * help, because it cannot.
 */
export const EmergencyContactCard = ({
  contacts,
  emergencyServices,
  locale = 'en-IN',
  onCallContact,
  onCallEmergencyServices,
  onEdit,
  onAdd,
  onVerify,
  maskNumbers = true,
  offline = false,
  crisisSupport,
  style,
  containerStyle,
  testID,
}: EmergencyContactCardProps) => {
  const theme = useAppTheme();
  const health = useHealthTheme();
  const confirm = useConfirm();

  const ordered = useMemo(
    () => [...contacts].sort((a, b) => Number(!!b.isPrimary) - Number(!!a.isPrimary)),
    [contacts],
  );

  const callContact = useCallback(
    async (contact: EmergencyContact) => {
      if (contact.status === 'invalid') return;
      // Confirmation for personal contacts only.
      const ok = await confirm({
        title: `Call ${contact.name}?`,
        message: `${contact.relationship ?? 'Emergency contact'} · ${maskNumbers ? maskPhone(contact.phone) : contact.phone}`,
        confirmLabel: 'Call',
        cancelLabel: 'Cancel',
      });
      if (ok) onCallContact(contact);
    },
    [confirm, maskNumbers, onCallContact],
  );

  return (
    <View style={[{ gap: theme.spacing.md }, containerStyle, style]} testID={testID}>
      {/* Emergency services first, and always available — even offline. */}
      <AppCard
        variant="outlined"
        style={{ borderColor: health.colors.urgentAccent, borderWidth: 2 }}
        testID={childTestID(testID, 'services')}
      >
        <View style={{ gap: theme.spacing.sm }}>
          <View style={[styles.row, { gap: theme.spacing.xs }]}>
            <Icon source="alert-circle" size={20} color={health.colors.urgentAccent} />
            <Text variant="titleSmall" style={styles.flex}>
              {emergencyServices.label}
            </Text>
          </View>

          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            If you have severe symptoms or feel unsafe, call your local emergency number now. This app cannot send help
            to you.
          </Text>

          <AppButton
            variant="danger"
            size="lg"
            fullWidth
            icon="phone"
            // No confirmation step — friction here is the dangerous option.
            onPress={onCallEmergencyServices}
            accessibilityLabel={`Call emergency services on ${emergencyServices.number}`}
            testID={childTestID(testID, 'call-emergency')}
          >
            {`Call ${emergencyServices.number}`}
          </AppButton>

          {crisisSupport ? (
            <AppButton
              variant="secondary"
              fullWidth
              icon="lifebuoy"
              onPress={crisisSupport.onPress}
              testID={childTestID(testID, 'crisis')}
            >
              {crisisSupport.label}
            </AppButton>
          ) : null}

          {crisisSupport?.description ? (
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {crisisSupport.description}
            </Text>
          ) : null}
        </View>
      </AppCard>

      {offline ? (
        <View style={[styles.row, { gap: 4 }]}>
          <Icon source="wifi-off" size={14} color={health.colors.statusRequiresAction} />
          <Text variant="labelSmall" style={{ color: health.colors.statusRequiresAction, flex: 1 }}>
            You are offline. These numbers are saved on your device and calling still works.
          </Text>
        </View>
      ) : null}

      {ordered.length === 0 ? (
        <StateView
          preset="empty"
          compact
          title="No emergency contact saved"
          description="Add someone we can suggest you call. Adding a contact does not let the app call them for you."
          primaryAction={onAdd ? { label: 'Add a contact', onPress: onAdd } : undefined}
          testID={childTestID(testID, 'empty')}
        />
      ) : (
        ordered.map((contact) => {
          const invalid = contact.status === 'invalid';
          const needsVerification = contact.status === 'needsVerification';

          return (
            <AppCard key={contact.id} variant="outlined" testID={childTestID(testID, `contact-${contact.id}`)}>
              <View style={[styles.row, { gap: theme.spacing.sm }]}>
                <View
                  style={[
                    styles.iconWell,
                    { backgroundColor: theme.colors.surfaceVariant, borderRadius: theme.radii.pill },
                  ]}
                >
                  <Icon source="account-heart-outline" size={20} color={health.colors.onSurfaceCalm} />
                </View>

                <View style={styles.flex}>
                  <View style={[styles.row, { gap: theme.spacing.xs }]}>
                    <Text variant="titleSmall" style={styles.flex}>
                      {contact.name}
                    </Text>
                    {contact.isPrimary ? (
                      <Text variant="labelSmall" style={{ color: health.colors.statusReady }}>
                        Primary
                      </Text>
                    ) : null}
                  </View>

                  {contact.relationship ? (
                    <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      {contact.relationship}
                    </Text>
                  ) : null}

                  <Text variant="bodyMedium" style={styles.tabular}>
                    {maskNumbers ? maskPhone(contact.phone) : contact.phone}
                  </Text>

                  {invalid ? (
                    <View style={[styles.row, { gap: 4 }]}>
                      <Icon source="phone-alert-outline" size={13} color={health.colors.urgentAccent} />
                      <Text variant="labelSmall" style={{ color: health.colors.urgentAccent, flex: 1 }}>
                        This number does not look valid. Please update it.
                      </Text>
                    </View>
                  ) : needsVerification ? (
                    <View style={[styles.row, { gap: 4 }]}>
                      <Icon source="clock-alert-outline" size={13} color={health.colors.statusRequiresAction} />
                      <Text variant="labelSmall" style={{ color: health.colors.statusRequiresAction, flex: 1 }}>
                        Not confirmed
                        {contact.lastConfirmedAt
                          ? ` since ${formatRelativeDate(contact.lastConfirmedAt, locale)}`
                          : ''}
                      </Text>
                    </View>
                  ) : contact.lastConfirmedAt ? (
                    <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      Confirmed {formatRelativeDate(contact.lastConfirmedAt, locale)}
                    </Text>
                  ) : null}
                </View>
              </View>

              <View style={[styles.actions, { gap: theme.spacing.sm, marginTop: theme.spacing.sm }]}>
                <AppButton
                  variant="secondary"
                  size="sm"
                  icon="phone-outline"
                  disabled={invalid}
                  onPress={() => void callContact(contact)}
                  containerStyle={styles.flex}
                  accessibilityLabel={`Call ${contact.name}`}
                  testID={childTestID(testID, `call-${contact.id}`)}
                >
                  {`Call ${contact.name.split(' ')[0]}`}
                </AppButton>

                {needsVerification && onVerify ? (
                  <AppButton
                    variant="ghost"
                    size="sm"
                    onPress={() => onVerify(contact)}
                    testID={childTestID(testID, `verify-${contact.id}`)}
                  >
                    Confirm
                  </AppButton>
                ) : null}

                {onEdit ? (
                  <AppButton
                    variant="ghost"
                    size="sm"
                    onPress={() => onEdit(contact)}
                    accessibilityLabel={`Edit ${contact.name}`}
                    testID={childTestID(testID, `edit-${contact.id}`)}
                  >
                    Edit
                  </AppButton>
                ) : null}
              </View>
            </AppCard>
          );
        })
      )}

      {onAdd && ordered.length > 0 ? (
        <AppButton variant="ghost" icon="plus" fullWidth onPress={onAdd} testID={childTestID(testID, 'add')}>
          Add another contact
        </AppButton>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  iconWell: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  flex: { flex: 1 },
  tabular: { fontVariant: ['tabular-nums'] },
});
