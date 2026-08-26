import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, IconButton, Surface, Text } from 'react-native-paper';

import { AppButton } from '@ui/atoms/AppButton';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useAgriLogisticsTheme } from '../theme/agritechTokens';
import type { AdvisoryAlert, AdvisorySeverity } from '../types/domain';

export interface AdvisoryAlertBannerProps extends StyleEscapeHatches {
  alert: AdvisoryAlert;
  onAction?: (alert: AdvisoryAlert) => void;
  onDismiss?: (alert: AdvisoryAlert) => void;
  onSnooze?: (alert: AdvisoryAlert) => void;
  onListen?: (alert: AdvisoryAlert) => void;
}

const SEVERITY_META: Record<AdvisorySeverity, { label: string; icon: string; colorKey: 'severityInfo' | 'severityWatch' | 'severityWarning' | 'severityUrgent' }> = {
  info: { label: 'Information', icon: 'information-outline', colorKey: 'severityInfo' },
  watch: { label: 'Watch', icon: 'eye-outline', colorKey: 'severityWatch' },
  warning: { label: 'Warning', icon: 'alert-outline', colorKey: 'severityWarning' },
  urgent: { label: 'Urgent', icon: 'alert-decagram', colorKey: 'severityUrgent' },
};

/**
 * Severity always renders as an icon plus a word — never colour alone — and
 * the message is plain-language advisory text supplied by a validated
 * advisory engine. This component never generates or infers pesticide or
 * chemical guidance itself; `message` and `actionLabel` are the engine's
 * output, rendered as-is.
 */
export const AdvisoryAlertBanner = ({ alert, onAction, onDismiss, onSnooze, onListen, style, containerStyle, testID }: AdvisoryAlertBannerProps) => {
  const theme = useAppTheme();
  const agri = useAgriLogisticsTheme();
  const id = testID ?? `advisory-${alert.id}`;
  const meta = SEVERITY_META[alert.severity];

  return (
    <Surface elevation={1} style={[styles.surface, { borderRadius: theme.radii.md, borderLeftColor: agri.colors[meta.colorKey], borderLeftWidth: 4 }, containerStyle, style]} testID={id}>
      <View style={{ gap: 6 }}>
        <View style={styles.row}>
          <Icon source={meta.icon} size={16} color={agri.colors[meta.colorKey]} />
          <Text variant="labelMedium" style={{ color: agri.colors[meta.colorKey], marginLeft: 6, flex: 1 }}>
            {meta.label}
          </Text>
          {onListen ? (
            <IconButton icon="volume-high" size={16} onPress={() => onListen(alert)} accessibilityLabel="Listen to this advisory" style={styles.noMargin} testID={childTestID(id, 'listen')} />
          ) : null}
          {onDismiss ? (
            <IconButton icon="close" size={16} onPress={() => onDismiss(alert)} accessibilityLabel="Dismiss advisory" style={styles.noMargin} testID={childTestID(id, 'dismiss')} />
          ) : null}
        </View>

        <Text variant="titleSmall">{alert.title}</Text>
        <Text variant="bodySmall" style={{ color: agri.colors.onSurfaceVariant }}>
          {alert.message}
        </Text>

        {alert.cropName || alert.fieldName ? (
          <Text variant="labelSmall" style={{ color: agri.colors.onSurfaceVariant }}>
            {[alert.cropName, alert.fieldName].filter(Boolean).join(' · ')}
          </Text>
        ) : null}

        <Text variant="labelSmall" style={{ color: agri.colors.onSurfaceVariant }}>
          {alert.issuedAt ? `Issued ${alert.issuedAt}` : ''}
          {alert.source ? ` · ${alert.source}` : ''}
        </Text>

        <View style={styles.row}>
          {alert.actionLabel && onAction ? (
            <AppButton variant="primary" size="sm" onPress={() => onAction(alert)} testID={childTestID(id, 'action')}>
              {alert.actionLabel}
            </AppButton>
          ) : null}
          {onSnooze ? (
            <AppButton variant="ghost" size="sm" onPress={() => onSnooze(alert)} style={{ marginLeft: 8 }} testID={childTestID(id, 'snooze')}>
              Dismiss until tomorrow
            </AppButton>
          ) : null}
        </View>
      </View>
    </Surface>
  );
};

const styles = StyleSheet.create({
  surface: { padding: 12 },
  row: { flexDirection: 'row', alignItems: 'center' },
  noMargin: { margin: 0 },
});
