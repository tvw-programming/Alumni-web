import React, { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Icon, Text } from 'react-native-paper';

import { ListItemRow } from '@ui/molecules/ListItemRow';
import { useAppTheme } from '@/theme';
import { childTestID, formatRelativeDate } from '@/utils';
import type { AnimatableProps } from '@/hooks';

import { useHealthTheme } from '../theme/healthcareTokens';
import type { DocumentStatus, DocumentType, HealthDocument } from '../types/domain';

const TYPE_META: Record<DocumentType, { label: string; icon: string }> = {
  prescription: { label: 'Prescription', icon: 'prescription' },
  labReport: { label: 'Lab report', icon: 'test-tube' },
  imaging: { label: 'Imaging', icon: 'radiology-box-outline' },
  consultNote: { label: 'Consultation note', icon: 'file-document-outline' },
  insurance: { label: 'Insurance', icon: 'shield-account-outline' },
  other: { label: 'Document', icon: 'file-outline' },
};

/**
 * Status copy. "New" and "Requires follow-up" are distinct on purpose — a result
 * you have not opened yet is not the same as one a clinician flagged.
 */
const STATUS_META: Record<DocumentStatus, { label: string; icon: string; colorKey: 'statusUpcoming' | 'statusReady' | 'statusCompleted' | 'statusRequiresAction' | 'statusCanceled' }> = {
  processing: { label: 'Processing', icon: 'progress-clock', colorKey: 'statusCompleted' },
  available: { label: 'Available', icon: 'check-circle-outline', colorKey: 'statusReady' },
  reviewed: { label: 'Reviewed by your care team', icon: 'stethoscope', colorKey: 'statusReady' },
  restricted: { label: 'Access restricted', icon: 'lock-outline', colorKey: 'statusCanceled' },
  expired: { label: 'Link expired', icon: 'link-off', colorKey: 'statusCompleted' },
  new: { label: 'New', icon: 'star-circle-outline', colorKey: 'statusUpcoming' },
};

const formatSize = (bytes?: number): string => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export interface ReportListItemProps extends Pick<AnimatableProps, 'animated' | 'entering' | 'index'> {
  document: HealthDocument;
  locale?: string;
  onOpen?: (document: HealthDocument) => void;
  onDownload?: (document: HealthDocument) => void;
  downloading?: boolean;
  divider?: boolean;
  testID?: string;
}

/**
 * A row in the records list.
 *
 * The important restraint: `abnormal` is styled calmly and separately from
 * `requiresFollowUp`. An out-of-range lab value is common and usually routine;
 * only a clinician marking it urgent earns urgent treatment.
 */
export const ReportListItem = memo(function ReportListItem({
  document,
  locale = 'en-IN',
  onOpen,
  onDownload,
  downloading = false,
  divider = true,
  animated = true,
  entering = false,
  index = 0,
  testID,
}: ReportListItemProps) {
  const theme = useAppTheme();
  const health = useHealthTheme();

  const id = testID ?? `doc-${document.id}`;
  const typeMeta = TYPE_META[document.type];
  const statusMeta = STATUS_META[document.status];
  const statusColor = health.colors[statusMeta.colorKey];

  const subtitle = useMemo(
    () =>
      [
        typeMeta.label,
        formatRelativeDate(document.date, locale),
        document.provider,
        document.file ? `${document.file.mimeType.split('/')[1]?.toUpperCase()} ${formatSize(document.file.size)}`.trim() : undefined,
      ]
        .filter(Boolean)
        .join(' · '),
    [document, locale, typeMeta.label],
  );

  /** A full spoken summary — a PDF row that reads as "file" helps nobody. */
  const accessibleName = useMemo(
    () =>
      [
        `${typeMeta.label}: ${document.title}`,
        formatRelativeDate(document.date, locale),
        document.provider ? `from ${document.provider}` : undefined,
        statusMeta.label,
        document.abnormal ? 'contains an out-of-range result' : undefined,
        document.requiresFollowUp ? 'your care team has asked you to follow up' : undefined,
      ]
        .filter(Boolean)
        .join(', '),
    [document, locale, statusMeta.label, typeMeta.label],
  );

  return (
    <ListItemRow
      title={document.title}
      subtitle={subtitle}
      size="lg"
      divider={divider}
      animated={animated}
      entering={entering}
      index={index}
      disabled={document.status === 'restricted' || document.status === 'processing'}
      onPress={onOpen ? () => onOpen(document) : undefined}
      testID={id}
      leading={
        <View
          style={[
            styles.iconWell,
            { backgroundColor: theme.colors.surfaceVariant, borderRadius: theme.radii.md },
          ]}
        >
          <Icon source={typeMeta.icon} size={20} color={health.colors.onSurfaceCalm} />
        </View>
      }
      trailing={
        <View style={styles.trailing}>
          <View style={[styles.row, { gap: 3 }]}>
            <Icon source={statusMeta.icon} size={12} color={statusColor} />
            <Text variant="labelSmall" style={{ color: statusColor }} numberOfLines={1}>
              {statusMeta.label}
            </Text>
          </View>

          {/* Abnormal: informational tone. Follow-up: the clinician's flag. */}
          {document.abnormal ? (
            <View style={[styles.row, { gap: 3, marginTop: 2 }]}>
              <Icon source="information-outline" size={12} color={health.colors.rangeOutside} />
              <Text variant="labelSmall" style={{ color: health.colors.rangeOutside }}>
                Out of range
              </Text>
            </View>
          ) : null}

          {document.requiresFollowUp ? (
            <View style={[styles.row, { gap: 3, marginTop: 2 }]}>
              <Icon source="stethoscope" size={12} color={health.colors.rangeReview} />
              <Text variant="labelSmall" style={{ color: health.colors.rangeReview }}>
                Follow up
              </Text>
            </View>
          ) : null}

          {downloading ? (
            <ActivityIndicator size={14} style={{ marginTop: 4 }} testID={childTestID(id, 'downloading')} />
          ) : onDownload && document.status !== 'restricted' && document.status !== 'processing' ? (
            <Text
              variant="labelSmall"
              onPress={() => onDownload(document)}
              accessibilityRole="button"
              accessibilityLabel={`Download ${document.title}`}
              style={{ color: theme.colors.primary, marginTop: 4 }}
              testID={childTestID(id, 'download')}
            >
              Download
            </Text>
          ) : null}
        </View>
      }
      // The row's own label carries the full summary.
      {...{ accessibilityLabel: accessibleName }}
    />
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  iconWell: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  trailing: { alignItems: 'flex-end', maxWidth: 130 },
});
