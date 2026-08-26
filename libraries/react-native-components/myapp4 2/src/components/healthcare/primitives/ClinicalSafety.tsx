import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, Text } from 'react-native-paper';

import { AppButton } from '@ui/atoms/AppButton';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';

import { useHealthTheme } from '../theme/healthcareTokens';
import type { Provenance } from '../types/domain';

/**
 * Cross-cutting clinical-safety primitives.
 *
 * These exist because the same two patterns recur across the library and must
 * behave identically everywhere: telling the user where a number came from, and
 * getting them out of the app when they need real help.
 */

const PROVENANCE_META: Record<Provenance, { label: string; icon: string; colorKey: 'provenancePatient' | 'provenanceDevice' | 'provenanceClinician' | 'provenanceUnknown' }> = {
  patientReported: { label: 'You entered this', icon: 'account-edit-outline', colorKey: 'provenancePatient' },
  deviceSynced: { label: 'From your device', icon: 'watch-variant', colorKey: 'provenanceDevice' },
  clinicianReviewed: { label: 'Reviewed by your care team', icon: 'stethoscope', colorKey: 'provenanceClinician' },
  sourceUnknown: { label: 'Source unknown', icon: 'help-circle-outline', colorKey: 'provenanceUnknown' },
};

export interface ProvenanceLabelProps {
  provenance: Provenance;
  /** Device or clinician name, appended when known. */
  source?: string;
  stale?: boolean;
  staleNote?: string;
  compact?: boolean;
  testID?: string;
}

/**
 * Where a health value came from.
 *
 * A patient-entered blood pressure, a device sync and a clinician-reviewed
 * result carry very different weight, so they must never render identically.
 */
export const ProvenanceLabel = ({
  provenance,
  source,
  stale = false,
  staleNote,
  compact = false,
  testID,
}: ProvenanceLabelProps) => {
  const theme = useAppTheme();
  const health = useHealthTheme();
  const meta = PROVENANCE_META[provenance];
  const color = health.colors[meta.colorKey];

  const label = source ? `${meta.label} · ${source}` : meta.label;

  return (
    <View style={styles.row} testID={testID}>
      <Icon source={meta.icon} size={compact ? 12 : 14} color={color} />
      <Text
        variant="labelSmall"
        style={{ color, marginLeft: 4 }}
        numberOfLines={1}
        accessibilityLabel={`Data source: ${label}${stale ? '. This reading may be out of date.' : ''}`}
      >
        {label}
      </Text>
      {stale ? (
        <>
          <View style={{ marginLeft: 6 }}>
            <Icon source="clock-alert-outline" size={compact ? 12 : 14} color={health.colors.stale} />
          </View>
          <Text variant="labelSmall" style={{ color: health.colors.stale, marginLeft: 2 }}>
            {staleNote ?? 'Out of date'}
          </Text>
        </>
      ) : null}
      {/* Padding keeps the row from collapsing when the label is short. */}
      <View style={{ width: theme.spacing.xxs }} />
    </View>
  );
};

export interface UrgentEscalationProps {
  /** Locale-aware — 112, 911, 108 all exist. Never hardcode one. */
  emergencyNumber: string;
  title?: string;
  message?: string;
  onCallEmergency?: () => void;
  /** Secondary route: nurse line, crisis support, urgent care. */
  secondaryAction?: { label: string; onPress: () => void };
  variant?: 'banner' | 'blocking';
  testID?: string;
}

/**
 * Emergency escalation.
 *
 * Deliberately not styled like an error toast: it is always visible, never
 * dismissible-by-accident, and never buried at the end of a questionnaire. When
 * `variant="blocking"` the calling flow is expected to pause behind it.
 */
export const UrgentEscalation = ({
  emergencyNumber,
  title = 'This may need urgent care',
  message,
  onCallEmergency,
  secondaryAction,
  variant = 'banner',
  testID,
}: UrgentEscalationProps) => {
  const theme = useAppTheme();
  const health = useHealthTheme();

  return (
    <View
      style={[
        styles.escalation,
        {
          backgroundColor: health.colors.urgentSurface,
          borderRadius: theme.radii.md,
          borderLeftWidth: 4,
          borderLeftColor: health.colors.urgentAccent,
          padding: theme.spacing.md,
          gap: theme.spacing.sm,
        },
      ]}
      accessible
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      accessibilityLabel={`${title}. ${message ?? ''}`}
      testID={testID}
    >
      <View style={styles.row}>
        <Icon source="alert-circle" size={20} color={health.colors.urgentAccent} />
        <Text variant="titleSmall" style={{ color: health.colors.onUrgentSurface, marginLeft: theme.spacing.xs, flex: 1 }}>
          {title}
        </Text>
      </View>

      <Text variant="bodySmall" style={{ color: health.colors.onUrgentSurface }}>
        {message ??
          `If you have severe symptoms or believe this is an emergency, call ${emergencyNumber} or your local emergency number now. This service is not for emergencies.`}
      </Text>

      <View style={[styles.actions, { gap: theme.spacing.sm }]}>
        {onCallEmergency ? (
          <AppButton
            variant="danger"
            size={variant === 'blocking' ? 'md' : 'sm'}
            icon="phone"
            onPress={onCallEmergency}
            testID={childTestID(testID, 'call')}
          >
            {`Call ${emergencyNumber}`}
          </AppButton>
        ) : null}
        {secondaryAction ? (
          <AppButton
            variant="secondary"
            size={variant === 'blocking' ? 'md' : 'sm'}
            onPress={secondaryAction.onPress}
            testID={childTestID(testID, 'secondary')}
          >
            {secondaryAction.label}
          </AppButton>
        ) : null}
      </View>
    </View>
  );
};

export interface NotAdviceNoticeProps {
  /** Override for the flow's specific approved wording. */
  text?: string;
  testID?: string;
}

/** The standing disclaimer. Wording must come from clinical/legal governance. */
export const NotAdviceNotice = ({ text, testID }: NotAdviceNoticeProps) => {
  const theme = useAppTheme();
  return (
    <Text
      variant="labelSmall"
      style={{ color: theme.colors.onSurfaceVariant, lineHeight: 16 }}
      testID={testID}
    >
      {text ?? 'This tool does not diagnose medical conditions. Talk to your care team about your results.'}
    </Text>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  escalation: {},
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
});
