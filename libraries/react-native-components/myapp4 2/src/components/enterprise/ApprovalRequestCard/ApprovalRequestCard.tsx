import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Avatar, Divider, Icon, Text, TextInput } from 'react-native-paper';

import { AppButton } from '@ui/atoms/AppButton';
import { AppCard } from '@ui/molecules/AppCard';
import { AppSheet } from '@ui/organisms/AppSheet';
import { useAppTheme } from '@/theme';
import { childTestID, initialsOf } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useWorkspaceTheme } from '../theme/enterpriseTokens';
import type { ApprovalRequest, ApprovalStatus } from '../types/domain';

const STATUS_META: Record<ApprovalStatus, { label: string; icon: string; colorKey: 'success' | 'error' | 'onSurfaceVariant' | 'warning' }> = {
  pending: { label: 'Approval required', icon: 'clock-outline', colorKey: 'warning' },
  approved: { label: 'Approved', icon: 'check-circle', colorKey: 'success' },
  rejected: { label: 'Rejected', icon: 'close-circle', colorKey: 'error' },
  reassigned: { label: 'Reassigned', icon: 'account-switch-outline', colorKey: 'onSurfaceVariant' },
  expired: { label: 'Expired', icon: 'clock-alert-outline', colorKey: 'onSurfaceVariant' },
};

export interface ApprovalRequestCardProps extends StyleEscapeHatches {
  request: ApprovalRequest;
  canApprove: boolean;
  processing?: 'approving' | 'rejecting' | null;
  onApprove: (comment?: string) => void;
  onReject: (comment: string) => void;
  onReassign?: () => void;
  onOpenDetails?: () => void;
}

/**
 * Reject always requires a reason — the confirm button stays disabled until
 * one is entered. The record summary sits above the action buttons, and a
 * request already resolved by another approver renders that fact instead of
 * a stale, still-tappable Approve/Reject pair.
 */
export const ApprovalRequestCard = ({ request, canApprove, processing = null, onApprove, onReject, onReassign, onOpenDetails, style, containerStyle, testID }: ApprovalRequestCardProps) => {
  const theme = useAppTheme();
  const enterprise = useWorkspaceTheme();
  const id = testID ?? `approval-${request.id}`;
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const meta = STATUS_META[request.status];
  const resolved = request.status !== 'pending';

  const handleReject = () => {
    if (!rejectReason.trim()) return;
    onReject(rejectReason.trim());
    setRejectOpen(false);
    setRejectReason('');
  };

  return (
    <AppCard variant="outlined" containerStyle={containerStyle} style={style} testID={id}>
      <View style={{ gap: theme.spacing.sm }}>
        <View style={styles.row}>
          <Text variant="titleSmall" style={styles.flex}>
            {request.title}
          </Text>
          <View style={styles.row}>
            <Icon source={meta.icon} size={13} color={enterprise.colors[meta.colorKey]} />
            <Text variant="labelSmall" style={{ color: enterprise.colors[meta.colorKey], marginLeft: 4 }}>
              {meta.label}
            </Text>
          </View>
        </View>

        <View style={styles.row}>
          {request.requester.avatar?.uri ? <Avatar.Image size={28} source={{ uri: request.requester.avatar.uri }} /> : <Avatar.Text size={28} label={initialsOf(request.requester.name)} />}
          <View style={{ marginLeft: 8 }}>
            <Text variant="bodySmall">{request.requester.name}</Text>
            <Text variant="labelSmall" style={{ color: enterprise.colors.onSurfaceVariant }}>
              Submitted {new Date(request.submittedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
            </Text>
          </View>
        </View>

        {request.amount ? <Text variant="headlineSmall">{request.amount}</Text> : null}
        {request.summary ? (
          <Text variant="bodySmall" style={{ color: enterprise.colors.onSurfaceVariant }} numberOfLines={3}>
            {request.summary}
          </Text>
        ) : null}

        {request.dueAt && request.status === 'pending' ? (
          <Text variant="labelSmall" style={{ color: enterprise.colors.onSurfaceVariant }}>
            Due {new Date(request.dueAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
          </Text>
        ) : null}

        {resolved && request.resolvedBy ? (
          <View style={[styles.resolvedRow, { backgroundColor: enterprise.colors.surfaceVariant, borderRadius: theme.radii.sm }]}>
            <Text variant="labelSmall" style={{ color: enterprise.colors.onSurfaceVariant }}>
              {request.status === 'approved' ? 'Approved' : request.status === 'rejected' ? 'Rejected' : 'Resolved'} by {request.resolvedBy.name}
              {request.resolvedNote ? `: "${request.resolvedNote}"` : ''}
            </Text>
          </View>
        ) : resolved ? (
          <Text variant="labelSmall" style={{ color: enterprise.colors.onSurfaceVariant }}>
            This request was already resolved.
          </Text>
        ) : null}

        {!resolved && canApprove ? (
          <>
            <Divider />
            <View style={[styles.row, { gap: theme.spacing.sm }]}>
              <AppButton variant="danger" size="sm" containerStyle={styles.flex} onPress={() => setRejectOpen(true)} disabled={!!processing} testID={childTestID(id, 'reject')}>
                Reject
              </AppButton>
              <AppButton variant="primary" size="sm" containerStyle={styles.flex} loading={processing === 'approving'} disabled={!!processing} onPress={() => onApprove()} testID={childTestID(id, 'approve')}>
                Approve
              </AppButton>
            </View>
            {onReassign ? (
              <Text variant="labelMedium" onPress={onReassign} accessibilityRole="button" style={{ color: theme.colors.primary, textAlign: 'center' }} testID={childTestID(id, 'reassign')}>
                Reassign
              </Text>
            ) : null}
          </>
        ) : !resolved && !canApprove ? (
          <Text variant="labelSmall" style={{ color: enterprise.colors.onSurfaceVariant }}>
            You don't have permission to act on this request.
          </Text>
        ) : null}

        {onOpenDetails ? (
          <Text variant="labelMedium" onPress={onOpenDetails} accessibilityRole="button" style={{ color: theme.colors.primary }} testID={childTestID(id, 'details')}>
            View details
          </Text>
        ) : null}
      </View>

      <AppSheet visible={rejectOpen} onDismiss={() => setRejectOpen(false)} variant="center" scrollable={false} title="Reject request" testID={childTestID(id, 'reject-sheet')}>
        <View style={{ padding: theme.spacing.lg, gap: theme.spacing.sm }}>
          <Text variant="bodySmall" style={{ color: enterprise.colors.onSurfaceVariant }}>
            A reason is required to reject.
          </Text>
          <TextInput mode="outlined" label="Reason" multiline value={rejectReason} onChangeText={setRejectReason} autoFocus testID={childTestID(id, 'reject-reason')} />
          <AppButton variant="danger" size="lg" fullWidth disabled={!rejectReason.trim()} loading={processing === 'rejecting'} onPress={handleReject} testID={childTestID(id, 'confirm-reject')}>
            Confirm rejection
          </AppButton>
        </View>
      </AppSheet>
    </AppCard>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  resolvedRow: { padding: 8 },
});
