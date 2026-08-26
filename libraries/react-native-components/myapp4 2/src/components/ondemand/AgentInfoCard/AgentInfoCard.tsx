import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Avatar, Icon, Text, TouchableRipple } from 'react-native-paper';

import { AppCard } from '@ui/molecules/AppCard';
import { RatingStars } from '@ui/atoms/RatingStars';
import { useAppTheme } from '@/theme';
import { childTestID, initialsOf } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useServiceTheme } from '../theme/ondemandTokens';
import type { Agent, OtpCodeStatus } from '../types/domain';

const ASSIGNMENT_COPY: Record<Agent['assignmentStatus'], { label: string; icon: string }> = {
  assigned: { label: 'Assigned', icon: 'account-check-outline' },
  enRoute: { label: 'On the way', icon: 'bike-fast' },
  arrived: { label: 'Arrived', icon: 'map-marker-check' },
  changed: { label: 'Provider changed', icon: 'account-switch-outline' },
  unavailable: { label: 'Unavailable', icon: 'account-off-outline' },
};

export interface AgentInfoCardProps extends StyleEscapeHatches {
  agent: Agent;
  otpCode?: string;
  otpStatus?: OtpCodeStatus;
  otpExpiresInSeconds?: number;
  maskedPhoneLabel?: string;
  onCall?: () => void;
  onChat?: () => void;
  onCopyOtp?: (code: string) => void;
  onReportSafetyIssue?: () => void;
  onExplainVerification?: () => void;
}

/**
 * The handoff code (OTP/PIN) is hidden by default and only rendered on tap —
 * it is never spoken by a screen reader automatically and never rendered as
 * plain always-visible text, since it authorises a real-world handoff.
 * Copying requires an explicit tap and the component only ever asks the host
 * screen to actually write to the clipboard (`onCopyOtp`), keeping any native
 * clipboard permission out of the presentational layer.
 */
export const AgentInfoCard = ({
  agent,
  otpCode,
  otpStatus = 'notShown',
  otpExpiresInSeconds,
  maskedPhoneLabel,
  onCall,
  onChat,
  onCopyOtp,
  onReportSafetyIssue,
  onExplainVerification,
  style,
  containerStyle,
  testID,
}: AgentInfoCardProps) => {
  const theme = useAppTheme();
  const service = useServiceTheme();
  const id = testID ?? 'agent-info-card';
  const [revealed, setRevealed] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(otpExpiresInSeconds ?? 0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setSecondsLeft(otpExpiresInSeconds ?? 0);
  }, [otpExpiresInSeconds]);

  useEffect(() => {
    if (!revealed || secondsLeft <= 0) return;
    const timer = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [revealed, secondsLeft]);

  const expired = otpStatus === 'expired' || (otpExpiresInSeconds !== undefined && revealed && secondsLeft === 0);
  const assignment = ASSIGNMENT_COPY[agent.assignmentStatus];

  const handleCopy = () => {
    if (!otpCode) return;
    onCopyOtp?.(otpCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <AppCard variant="outlined" containerStyle={containerStyle} style={style} testID={id}>
      <View style={{ gap: theme.spacing.sm }}>
        <View style={styles.row}>
          {agent.avatar?.uri ? <Avatar.Image size={48} source={{ uri: agent.avatar.uri }} /> : <Avatar.Text size={48} label={initialsOf(agent.name)} />}
          <View style={[styles.flex, { marginLeft: theme.spacing.sm }]}>
            <View style={styles.row}>
              <Text variant="titleMedium" numberOfLines={1} style={styles.flex}>
                {agent.name}
              </Text>
              {agent.verified ? (
                <TouchableRipple
                  onPress={onExplainVerification}
                  disabled={!onExplainVerification}
                  accessibilityRole={onExplainVerification ? 'button' : undefined}
                  accessibilityLabel="Verified provider. Activate for details."
                  style={styles.verifiedChip}
                >
                  <View style={styles.row}>
                    <Icon source="shield-check" size={13} color={service.colors.verified} />
                    <Text variant="labelSmall" style={{ color: service.colors.verified, marginLeft: 3 }}>
                      Verified
                    </Text>
                  </View>
                </TouchableRipple>
              ) : null}
            </View>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {agent.roleLabel}
              {agent.vehicleLabel ? ` · ${agent.vehicleLabel}` : ''}
            </Text>
            {agent.rating ? (
              <View style={[styles.row, { marginTop: 2 }]}>
                <RatingStars value={agent.rating.average} size="sm" readonly showValue />
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 4 }}>
                  ({agent.rating.count})
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={[styles.row, { gap: 4 }]}>
          <Icon source={assignment.icon} size={14} color={theme.colors.onSurfaceVariant} />
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {assignment.label}
          </Text>
        </View>

        {(onCall || onChat) && (
          <View style={[styles.row, { gap: theme.spacing.sm }]}>
            {onChat ? (
              <TouchableRipple
                onPress={onChat}
                accessibilityRole="button"
                accessibilityLabel="Chat with provider, via app"
                style={[styles.actionButton, { borderColor: theme.colors.outlineVariant }]}
                testID={childTestID(id, 'chat')}
              >
                <View style={styles.row}>
                  <Icon source="chat-outline" size={16} color={theme.colors.primary} />
                  <Text variant="labelMedium" style={{ color: theme.colors.primary, marginLeft: 6 }}>
                    Chat
                  </Text>
                </View>
              </TouchableRipple>
            ) : null}
            {onCall ? (
              <TouchableRipple
                onPress={onCall}
                accessibilityRole="button"
                accessibilityLabel={`Call provider${maskedPhoneLabel ? `, ${maskedPhoneLabel}` : ', number is masked'}`}
                style={[styles.actionButton, { borderColor: theme.colors.outlineVariant }]}
                testID={childTestID(id, 'call')}
              >
                <View style={styles.row}>
                  <Icon source="phone-outline" size={16} color={theme.colors.primary} />
                  <Text variant="labelMedium" style={{ color: theme.colors.primary, marginLeft: 6 }}>
                    {maskedPhoneLabel ?? 'Call'}
                  </Text>
                </View>
              </TouchableRipple>
            ) : null}
          </View>
        )}

        {otpCode && otpStatus !== 'notShown' ? (
          <View style={[styles.otpBox, { backgroundColor: service.colors.otpSurface, borderColor: service.colors.otpBorder, borderRadius: theme.radii.md }]}>
            <View style={styles.row}>
              <Text variant="labelSmall" style={{ color: service.colors.onOtpSurface, flex: 1 }}>
                Share this code with your provider to start service
              </Text>
              {otpExpiresInSeconds !== undefined && revealed && !expired ? (
                <Text variant="labelSmall" style={{ color: service.colors.onOtpSurface }}>
                  Expires in {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}
                </Text>
              ) : null}
            </View>

            {expired ? (
              <Text variant="titleMedium" style={{ color: theme.colors.error, marginTop: 6 }}>
                Code expired
              </Text>
            ) : !revealed ? (
              <TouchableRipple
                onPress={() => setRevealed(true)}
                accessibilityRole="button"
                accessibilityLabel="Reveal handoff code"
                style={{ marginTop: 6, alignSelf: 'flex-start' }}
                testID={childTestID(id, 'reveal')}
              >
                <View style={styles.row}>
                  <Icon source="eye-outline" size={16} color={service.colors.onOtpSurface} />
                  <Text variant="labelMedium" style={{ color: service.colors.onOtpSurface, marginLeft: 6 }}>
                    Tap to reveal code
                  </Text>
                </View>
              </TouchableRipple>
            ) : (
              <View style={[styles.row, { marginTop: 6 }]}>
                <Text
                  variant="headlineSmall"
                  style={{ color: service.colors.onOtpSurface, letterSpacing: 6, flex: 1 }}
                  accessibilityLabel={`Handoff code ${otpCode.split('').join(' ')}`}
                  testID={childTestID(id, 'otp-value')}
                >
                  {otpCode}
                </Text>
                <TouchableRipple
                  onPress={handleCopy}
                  accessibilityRole="button"
                  accessibilityLabel={copied ? 'Code copied' : 'Copy code'}
                  style={styles.iconButton}
                  testID={childTestID(id, 'copy')}
                >
                  <Icon source={copied ? 'check' : 'content-copy'} size={18} color={service.colors.onOtpSurface} />
                </TouchableRipple>
              </View>
            )}
          </View>
        ) : null}

        {onReportSafetyIssue ? (
          <TouchableRipple
            onPress={onReportSafetyIssue}
            accessibilityRole="button"
            accessibilityLabel="Report a safety issue"
            style={{ alignSelf: 'flex-start', marginTop: theme.spacing.xs }}
            testID={childTestID(id, 'safety')}
          >
            <View style={styles.row}>
              <Icon source="shield-alert-outline" size={15} color={service.colors.statusFailed} />
              <Text variant="labelSmall" style={{ color: service.colors.statusFailed, marginLeft: 5 }}>
                Report a safety issue
              </Text>
            </View>
          </TouchableRipple>
        ) : null}
      </View>
    </AppCard>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  verifiedChip: { marginLeft: 8 },
  actionButton: { flex: 1, borderWidth: StyleSheet.hairlineWidth, borderRadius: 20, paddingVertical: 8, alignItems: 'center' },
  otpBox: { borderWidth: StyleSheet.hairlineWidth, padding: 12 },
  iconButton: { padding: 6 },
});
