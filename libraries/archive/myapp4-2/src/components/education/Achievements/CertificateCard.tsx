import React, { useMemo, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Divider, Icon, Text } from 'react-native-paper';

import { AppButton } from '@ui/atoms/AppButton';
import { AppCard } from '@ui/molecules/AppCard';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useLearnTheme } from '../theme/educationTokens';
import type { Certificate } from '../types/domain';

export interface CertificateCardProps extends StyleEscapeHatches {
  certificate: Certificate;
  locale?: string;
  onDownload?: (certificate: Certificate) => void;
  onShare?: (certificate: Certificate) => void;
  onVerify?: (certificate: Certificate) => void;
  downloading?: boolean;
  errorMessage?: string;
  onRetry?: () => void;
}

/** A completed-course credential, with sharing kept optional. */
export const CertificateCard = ({
  certificate,
  locale = 'en-IN',
  onDownload,
  onShare,
  onVerify,
  downloading = false,
  errorMessage,
  onRetry,
  style,
  containerStyle,
  testID,
}: CertificateCardProps) => {
  const theme = useAppTheme();
  const learn = useLearnTheme();
  const [imageFailed, setImageFailed] = useState(false);

  const id = testID ?? `certificate-${certificate.id}`;
  const available = certificate.status === 'available';

  const issued = useMemo(
    () => new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(new Date(certificate.issuedAt)),
    [certificate.issuedAt, locale],
  );

  return (
    <AppCard
      variant="outlined"
      containerStyle={containerStyle}
      style={style}
      padded={false}
      testID={id}
    >
      <View
        style={[
          styles.preview,
          { backgroundColor: learn.colors.rewardSurface, aspectRatio: 1.55 },
        ]}
      >
        {certificate.previewImage?.uri && !imageFailed ? (
          <Image
            source={{ uri: certificate.previewImage.uri }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            onError={() => setImageFailed(true)}
            accessibilityElementsHidden
          />
        ) : (
          // A described placeholder, never a blank box.
          <View style={[StyleSheet.absoluteFill, styles.center, { padding: theme.spacing.md }]}>
            <Icon source="certificate" size={36} color={learn.colors.rewardAccent} />
            <Text
              variant="labelSmall"
              style={{ color: learn.colors.onRewardSurface, textAlign: 'center', marginTop: 6 }}
              numberOfLines={3}
            >
              {certificate.previewImage?.alt ?? `Certificate of completion for ${certificate.courseTitle}`}
            </Text>
          </View>
        )}

        {!available ? (
          <View style={[StyleSheet.absoluteFill, styles.center, styles.dim]}>
            <Icon source={certificate.status === 'processing' ? 'progress-clock' : 'lock-outline'} size={24} color="#FFFFFF" />
            <Text variant="labelMedium" style={{ color: '#FFFFFF', marginTop: 4 }}>
              {certificate.status === 'processing' ? 'Preparing your certificate' : 'Not available yet'}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={{ padding: theme.spacing.md, gap: 4 }}>
        <Text variant="titleSmall">{certificate.courseTitle}</Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          Awarded to {certificate.learnerName}
        </Text>

        <View style={[styles.row, { gap: 4, marginTop: 2 }]}>
          <Icon source="check-decagram" size={14} color={learn.colors.statusCompleted} />
          <Text variant="labelSmall" style={{ color: learn.colors.statusCompleted }}>
            Certificate earned · {issued}
          </Text>
        </View>

        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }} selectable>
          Credential ID: {certificate.credentialId}
        </Text>

        {certificate.unavailableReason ? (
          <Text variant="labelSmall" style={{ color: learn.colors.statusLate, marginTop: 2 }}>
            {certificate.unavailableReason}
          </Text>
        ) : null}

        {errorMessage ? (
          <View style={[styles.row, { gap: 4, marginTop: 2 }]}>
            <Text variant="labelSmall" style={{ color: learn.colors.statusOverdue, flex: 1 }}>
              {errorMessage}
            </Text>
            {onRetry ? (
              <Text
                variant="labelSmall"
                onPress={onRetry}
                accessibilityRole="button"
                style={{ color: theme.colors.primary }}
              >
                Try again
              </Text>
            ) : null}
          </View>
        ) : null}

        <Divider style={{ marginVertical: theme.spacing.sm }} />

        <View style={[styles.actions, { gap: theme.spacing.sm }]}>
          {onDownload ? (
            <AppButton
              variant="primary"
              size="sm"
              icon="download"
              disabled={!available}
              loading={downloading}
              onPress={() => onDownload(certificate)}
              containerStyle={styles.flex}
              testID={childTestID(id, 'download')}
            >
              Download certificate
            </AppButton>
          ) : null}

          {/* Sharing is offered, never required. */}
          {onShare ? (
            <AppButton
              variant="ghost"
              size="sm"
              icon="share-variant"
              disabled={!available}
              onPress={() => onShare(certificate)}
              testID={childTestID(id, 'share')}
            >
              Share
            </AppButton>
          ) : null}

          {onVerify && certificate.verifyUrl ? (
            <AppButton variant="ghost" size="sm" onPress={() => onVerify(certificate)} testID={childTestID(id, 'verify')}>
              Verify
            </AppButton>
          ) : null}
        </View>
      </View>
    </AppCard>
  );
};

const styles = StyleSheet.create({
  preview: { width: '100%', overflow: 'hidden' },
  center: { alignItems: 'center', justifyContent: 'center' },
  dim: { backgroundColor: 'rgba(0,0,0,0.5)' },
  row: { flexDirection: 'row', alignItems: 'center' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  flex: { flex: 1 },
});
