import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Checkbox, Icon, ProgressBar, Text, TextInput } from 'react-native-paper';

import { AppButton } from '@ui/atoms/AppButton';
import { AppSheet } from '@ui/organisms/AppSheet';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useAgriLogisticsTheme } from '../theme/agritechTokens';
import type { EvidenceSubmission, PODMode, PODRequirement } from '../types/domain';

export interface PODCaptureSheetProps extends StyleEscapeHatches {
  visible: boolean;
  shipmentId: string;
  stopId: string;
  requirements: PODRequirement[];
  mode: PODMode;
  submitting?: boolean;
  uploadError?: string;
  onSubmit: (evidence: EvidenceSubmission) => void;
  onSaveOffline?: (evidence: EvidenceSubmission) => void;
  onCancel: () => void;
}

const MODE_TITLE: Record<PODMode, string> = {
  delivery: 'Proof of delivery',
  pickup: 'Proof of pickup',
  partialDelivery: 'Partial delivery',
  failedDelivery: 'Delivery exception',
};

const REQUIREMENT_META: Record<PODRequirement['type'], { label: string; icon: string }> = {
  photo: { label: 'Capture delivery photo', icon: 'camera-outline' },
  signature: { label: 'Collect signature', icon: 'draw-pen' },
  barcode: { label: 'Scan package barcode', icon: 'barcode-scan' },
  recipientName: { label: 'Recipient name', icon: 'account-outline' },
  note: { label: 'Add delivery note', icon: 'note-text-outline' },
};

/**
 * A delivery is never marked complete locally until every required proof
 * type is captured and the caller's submit succeeds — an upload failure
 * stays visible with "Saved for later," never silently retried into a
 * false "Delivered" state.
 */
export const PODCaptureSheet = ({ visible, shipmentId, stopId, requirements, mode, submitting = false, uploadError, onSubmit, onSaveOffline, onCancel, style, containerStyle, testID }: PODCaptureSheetProps) => {
  const theme = useAppTheme();
  const agri = useAgriLogisticsTheme();
  const id = testID ?? `pod-${stopId}`;
  const [captured, setCaptured] = useState<Record<string, boolean>>({});
  const [recipientName, setRecipientName] = useState('');
  const [note, setNote] = useState('');

  const isDone = (req: PODRequirement) => req.completed || captured[req.type] || (req.type === 'recipientName' && recipientName.trim().length > 0) || (req.type === 'note' && note.trim().length > 0);
  const allRequiredDone = requirements.filter((r) => r.required).every(isDone);

  const buildEvidence = (): EvidenceSubmission => ({
    shipmentId,
    stopId,
    mode,
    recipientName: recipientName.trim() || undefined,
    note: note.trim() || undefined,
    photoCaptured: captured.photo,
    signatureCaptured: captured.signature,
    barcode: captured.barcode ? 'SCANNED-CODE' : undefined,
  });

  return (
    <AppSheet visible={visible} onDismiss={onCancel} title={MODE_TITLE[mode]} containerStyle={containerStyle} style={style} testID={id}>
      <ScrollView style={{ maxHeight: 420 }}>
        {mode === 'partialDelivery' ? (
          <Text variant="labelSmall" style={{ color: agri.colors.warning, marginBottom: 8 }}>
            Mark items missing before submitting.
          </Text>
        ) : null}

        {requirements.map((req) => {
          const meta = REQUIREMENT_META[req.type];
          if (req.type === 'recipientName') {
            return (
              <TextInput key={req.type} mode="outlined" label={meta.label} value={recipientName} onChangeText={setRecipientName} style={{ marginBottom: 10 }} testID={childTestID(id, 'recipient')} />
            );
          }
          if (req.type === 'note') {
            return (
              <TextInput key={req.type} mode="outlined" label={meta.label} value={note} onChangeText={setNote} multiline style={{ marginBottom: 10 }} testID={childTestID(id, 'note')} />
            );
          }
          const done = isDone(req);
          return (
            <Checkbox.Item
              key={req.type}
              label={`${meta.label}${req.required ? '' : ' (optional)'}`}
              status={done ? 'checked' : 'unchecked'}
              onPress={() => setCaptured((prev) => ({ ...prev, [req.type]: !prev[req.type] }))}
              testID={childTestID(id, req.type)}
            />
          );
        })}

        {uploadError ? (
          <View style={[styles.errorRow, { backgroundColor: theme.colors.errorContainer, borderRadius: theme.radii.sm }]}>
            <Icon source="cloud-off-outline" size={14} color={theme.colors.onErrorContainer} />
            <Text variant="labelSmall" style={{ color: theme.colors.onErrorContainer, marginLeft: 6, flex: 1 }}>
              {uploadError}
            </Text>
          </View>
        ) : null}

        {submitting ? (
          <View style={styles.submittingRow}>
            <ActivityIndicator size={14} />
            <Text variant="labelSmall" style={{ color: agri.colors.onSurfaceVariant, marginLeft: 6 }}>
              Uploading proof…
            </Text>
            <ProgressBar indeterminate style={{ flex: 1, height: 3, marginLeft: 8 }} />
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <AppButton variant="ghost" size="md" onPress={onCancel} disabled={submitting} testID={childTestID(id, 'cancel')}>
          Cancel
        </AppButton>
        <View style={styles.flex} />
        {onSaveOffline ? (
          <AppButton variant="ghost" size="md" onPress={() => onSaveOffline(buildEvidence())} disabled={submitting} testID={childTestID(id, 'offline')}>
            Save offline
          </AppButton>
        ) : null}
        <AppButton
          variant="primary"
          size="md"
          loading={submitting}
          disabled={!allRequiredDone}
          onPress={() => onSubmit(buildEvidence())}
          style={{ marginLeft: 8 }}
          testID={childTestID(id, 'submit')}
        >
          {mode === 'failedDelivery' ? 'Submit exception' : mode === 'partialDelivery' ? 'Submit partial delivery' : 'Mark as delivered'}
        </AppButton>
      </View>
    </AppSheet>
  );
};

const styles = StyleSheet.create({
  errorRow: { flexDirection: 'row', alignItems: 'center', padding: 8, marginTop: 4 },
  submittingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  footer: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  flex: { flex: 1 },
});
