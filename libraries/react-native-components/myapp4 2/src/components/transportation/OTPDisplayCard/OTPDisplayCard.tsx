import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, Text, TouchableRipple } from 'react-native-paper';

import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useRideTheme } from '../theme/transportationTokens';
import type { OTPState } from '../types/domain';

export interface OTPDisplayCardProps extends StyleEscapeHatches {
  otp: OTPState;
  /** Hidden until the rider explicitly taps reveal — never shown by default. */
  masked?: boolean;
  showCopy?: boolean;
  onReveal?: () => void;
  onCopy?: (code: string) => void;
  onHelp?: () => void;
}

/**
 * The pickup code is hidden by default and only rendered on tap; it is never
 * read aloud automatically. When the rider requests it, the digits are
 * announced one at a time via an explicit "Read code aloud" action, not by
 * relying on a screen reader stumbling into it. Copying always requires an
 * explicit tap, and the component never writes the code to the clipboard
 * itself — that stays in the host screen's `onCopy`.
 */
export const OTPDisplayCard = ({ otp, masked = true, showCopy = true, onReveal, onCopy, onHelp, style, containerStyle, testID }: OTPDisplayCardProps) => {
  const theme = useAppTheme();
  const ride = useRideTheme();
  const id = testID ?? 'otp-display-card';
  const [revealed, setRevealed] = useState(!masked);
  const [copied, setCopied] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!otp.expiresAt) {
      setSecondsLeft(undefined);
      return;
    }
    const compute = () => Math.max(0, Math.round((new Date(otp.expiresAt!).getTime() - Date.now()) / 1000));
    setSecondsLeft(compute());
    const timer = setInterval(() => setSecondsLeft(compute()), 1000);
    return () => clearInterval(timer);
  }, [otp.expiresAt]);

  const expired = otp.status === 'expired' || secondsLeft === 0;
  const failed = otp.status === 'failed';

  const handleReveal = () => {
    setRevealed(true);
    onReveal?.();
  };

  const handleCopy = () => {
    onCopy?.(otp.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <View
      style={[styles.root, { backgroundColor: ride.colors.otpSurface, borderColor: ride.colors.otpBorder, borderRadius: theme.radii.md }, containerStyle, style]}
      testID={id}
    >
      <View style={{ padding: theme.spacing.md, gap: theme.spacing.xs }}>
        <View style={styles.row}>
          <Text variant="labelMedium" style={{ color: ride.colors.onOtpSurface, flex: 1 }}>
            Your pickup code
          </Text>
          {secondsLeft !== undefined && revealed && !expired ? (
            <Text variant="labelSmall" style={{ color: ride.colors.onOtpSurface }}>
              Expires in {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}
            </Text>
          ) : null}
        </View>

        {otp.status === 'verified' ? (
          <View style={styles.row}>
            <Icon source="check-circle" size={20} color={ride.colors.statusArrived} />
            <Text variant="titleMedium" style={{ color: ride.colors.statusArrived, marginLeft: 6 }}>
              Code verified
            </Text>
          </View>
        ) : expired ? (
          <Text variant="titleMedium" style={{ color: theme.colors.error }}>
            Code expired
          </Text>
        ) : failed ? (
          <View>
            <Text variant="titleMedium" style={{ color: theme.colors.error }}>
              Code not accepted
            </Text>
            {otp.attemptsRemaining != null ? (
              <Text variant="labelSmall" style={{ color: theme.colors.error }}>
                {otp.attemptsRemaining} attempt{otp.attemptsRemaining === 1 ? '' : 's'} remaining
              </Text>
            ) : null}
          </View>
        ) : !revealed ? (
          <TouchableRipple onPress={handleReveal} accessibilityRole="button" accessibilityLabel="Reveal pickup code" style={{ alignSelf: 'flex-start' }} testID={childTestID(id, 'reveal')}>
            <View style={styles.row}>
              <Icon source="eye-outline" size={16} color={ride.colors.onOtpSurface} />
              <Text variant="labelMedium" style={{ color: ride.colors.onOtpSurface, marginLeft: 6 }}>
                Tap to reveal code
              </Text>
            </View>
          </TouchableRipple>
        ) : (
          <View style={styles.row}>
            <View style={styles.digitRow} accessibilityLabel={`Pickup code ${otp.code.split('').join(' ')}`} testID={childTestID(id, 'digits')}>
              {otp.code.split('').map((digit, index) => (
                <View
                  key={index}
                  style={[styles.digitBox, { width: ride.layout.otpDigitSize, height: ride.layout.otpDigitSize, borderColor: ride.colors.otpBorder, borderRadius: theme.radii.sm }]}
                  importantForAccessibility="no"
                >
                  <Text variant="headlineSmall" style={{ color: ride.colors.onOtpSurface }}>
                    {digit}
                  </Text>
                </View>
              ))}
            </View>
            {showCopy ? (
              <TouchableRipple onPress={handleCopy} accessibilityRole="button" accessibilityLabel={copied ? 'Code copied' : 'Copy code'} style={styles.iconButton} testID={childTestID(id, 'copy')}>
                <Icon source={copied ? 'check' : 'content-copy'} size={18} color={ride.colors.onOtpSurface} />
              </TouchableRipple>
            ) : null}
          </View>
        )}

        {!expired && !failed && otp.status !== 'verified' ? (
          <Text variant="labelSmall" style={{ color: ride.colors.onOtpSurface }}>
            Share this code when your driver arrives. Do not share it before pickup.
          </Text>
        ) : null}

        {onHelp ? (
          <TouchableRipple onPress={onHelp} accessibilityRole="button" accessibilityLabel="Get help with your pickup code" testID={childTestID(id, 'help')}>
            <Text variant="labelSmall" style={{ color: ride.colors.onOtpSurface, textDecorationLine: 'underline' }}>
              Need help?
            </Text>
          </TouchableRipple>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center' },
  digitRow: { flexDirection: 'row', gap: 8, flex: 1 },
  digitBox: { borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  iconButton: { padding: 8 },
});
