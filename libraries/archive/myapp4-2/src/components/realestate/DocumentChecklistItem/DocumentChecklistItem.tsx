import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Icon, Text, TouchableRipple } from 'react-native-paper';

import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { usePropertyTheme } from '../theme/realestateTokens';
import type { DocumentChecklistData, DocumentStatus } from '../types/domain';

const STATUS_META: Record<DocumentStatus, { label: string; icon: string; colorKey: 'docNotStarted' | 'docUploaded' | 'docVerified' | 'docRejected' | 'error' }> = {
  notStarted: { label: 'Not started', icon: 'circle-outline', colorKey: 'docNotStarted' },
  uploaded: { label: 'Uploaded', icon: 'file-check-outline', colorKey: 'docUploaded' },
  uploading: { label: 'Uploading…', icon: 'progress-upload', colorKey: 'docUploaded' },
  verified: { label: 'Verified', icon: 'check-decagram', colorKey: 'docVerified' },
  rejected: { label: 'Document rejected', icon: 'close-circle-outline', colorKey: 'docRejected' },
  notApplicable: { label: 'Not applicable', icon: 'minus-circle-outline', colorKey: 'docNotStarted' },
  expired: { label: 'Expired', icon: 'clock-alert-outline', colorKey: 'error' },
  error: { label: 'Upload error', icon: 'alert-circle-outline', colorKey: 'error' },
};

export interface DocumentChecklistItemProps extends StyleEscapeHatches {
  document: DocumentChecklistData;
  onUpload?: (document: DocumentChecklistData) => void;
  onView?: (document: DocumentChecklistData) => void;
  onRetry?: (document: DocumentChecklistData) => void;
}

/**
 * "Uploaded" and "Verified" are always distinct states with distinct icons —
 * a green checkmark never appears for a file that has merely been uploaded,
 * only for one a reviewer has actually confirmed. Upload and view stay
 * independent tap targets, and this component never implies legal
 * verification on its own; that judgement belongs to the reviewer.
 */
export const DocumentChecklistItem = ({ document, onUpload, onView, onRetry, style, containerStyle, testID }: DocumentChecklistItemProps) => {
  const theme = useAppTheme();
  const realestate = usePropertyTheme();
  const id = testID ?? `document-${document.id}`;
  const meta = STATUS_META[document.status];
  const uploading = document.status === 'uploading';
  const canUpload = document.status === 'notStarted' || document.status === 'rejected' || document.status === 'expired';
  const hasFile = document.status === 'uploaded' || document.status === 'verified' || document.status === 'rejected';

  const a11yLabel = `${document.title}${document.required ? ', required' : ', optional'}, ${meta.label}${document.reviewerNote ? `, ${document.reviewerNote}` : ''}`;

  return (
    <View style={[styles.row, containerStyle, style]} testID={id} accessibilityRole="text" accessibilityLabel={a11yLabel}>
      <View style={styles.iconColumn}>
        {uploading ? <ActivityIndicator size={20} /> : <Icon source={meta.icon} size={20} color={realestate.colors[meta.colorKey]} />}
      </View>

      <View style={[styles.flex, { marginLeft: theme.spacing.sm }]}>
        <View style={styles.row}>
          <Text variant="bodyMedium" style={styles.flex}>
            {document.title}
          </Text>
          <Text variant="labelSmall" style={{ color: document.required ? realestate.colors.error : realestate.colors.onSurfaceVariant }}>
            {document.required ? 'Required' : 'Optional'}
          </Text>
        </View>

        {document.description ? (
          <Text variant="labelSmall" style={{ color: realestate.colors.onSurfaceVariant }} numberOfLines={2}>
            {document.description}
          </Text>
        ) : null}

        <Text variant="labelSmall" style={{ color: realestate.colors[meta.colorKey] }}>
          {meta.label}
          {document.fileName && hasFile ? ` · ${document.fileName}` : ''}
        </Text>

        {document.reviewerNote ? (
          <View style={[styles.noteRow, { backgroundColor: realestate.colors.surfaceVariant, borderRadius: theme.radii.sm }]}>
            <Icon source="comment-text-outline" size={12} color={realestate.colors.onSurfaceVariant} />
            <Text variant="labelSmall" style={{ color: realestate.colors.onSurfaceVariant, marginLeft: 4, flex: 1 }}>
              {document.reviewerNote}
            </Text>
          </View>
        ) : null}

        {document.updatedAtLabel ? (
          <Text variant="labelSmall" style={{ color: realestate.colors.onSurfaceVariant }}>
            Updated {document.updatedAtLabel}
          </Text>
        ) : null}

        <View style={[styles.row, { gap: theme.spacing.md, marginTop: 4 }]}>
          {hasFile && onView ? (
            <TouchableRipple onPress={() => onView(document)} accessibilityRole="button" accessibilityLabel={`View ${document.title}`} testID={childTestID(id, 'view')}>
              <Text variant="labelMedium" style={{ color: theme.colors.primary }}>
                View document
              </Text>
            </TouchableRipple>
          ) : null}
          {document.status === 'error' && onRetry ? (
            <TouchableRipple onPress={() => onRetry(document)} accessibilityRole="button" accessibilityLabel={`Retry uploading ${document.title}`} testID={childTestID(id, 'retry')}>
              <Text variant="labelMedium" style={{ color: theme.colors.primary }}>
                Retry upload
              </Text>
            </TouchableRipple>
          ) : canUpload && onUpload ? (
            <TouchableRipple onPress={() => onUpload(document)} accessibilityRole="button" accessibilityLabel={document.status === 'rejected' ? `Replace ${document.title}` : `Upload ${document.title}`} testID={childTestID(id, 'upload')}>
              <Text variant="labelMedium" style={{ color: theme.colors.primary }}>
                {document.status === 'rejected' || document.status === 'expired' ? 'Replace document' : 'Upload document'}
              </Text>
            </TouchableRipple>
          ) : null}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 8 },
  iconColumn: { width: 24, alignItems: 'center', paddingTop: 2 },
  flex: { flex: 1 },
  noteRow: { flexDirection: 'row', alignItems: 'center', padding: 6, marginTop: 4 },
});
