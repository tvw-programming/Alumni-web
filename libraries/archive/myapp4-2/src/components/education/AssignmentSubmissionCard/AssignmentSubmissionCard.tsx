import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Divider, Icon, ProgressBar, Text, TouchableRipple } from 'react-native-paper';

import { AppButton } from '@ui/atoms/AppButton';
import { AppCard } from '@ui/molecules/AppCard';
import { useConfirm } from '@ui/providers/ConfirmProvider';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { Attachment, StyleEscapeHatches } from '@ui/primitives';
import type { AnimatableProps } from '@/hooks';

import { useLearnTheme } from '../theme/educationTokens';
import type { AssignmentSubmission, SubmissionStatus } from '../types/domain';

/** Late is a policy state, not an error — the copy reflects that. */
const STATUS_META: Record<SubmissionStatus, { label: string; icon: string; colorKey: 'statusNotStarted' | 'statusInProgress' | 'statusCompleted' | 'statusLate' | 'statusPending' | 'statusOverdue' }> = {
  notStarted: { label: 'Not started', icon: 'circle-outline', colorKey: 'statusNotStarted' },
  draft: { label: 'Draft saved', icon: 'content-save-outline', colorKey: 'statusInProgress' },
  uploading: { label: 'Uploading', icon: 'upload', colorKey: 'statusInProgress' },
  submitted: { label: 'Submitted', icon: 'check-circle-outline', colorKey: 'statusCompleted' },
  late: { label: 'Late submission', icon: 'clock-alert-outline', colorKey: 'statusLate' },
  graded: { label: 'Graded', icon: 'star-circle-outline', colorKey: 'statusCompleted' },
  revisionRequired: { label: 'Revision requested', icon: 'file-edit-outline', colorKey: 'statusPending' },
  error: { label: 'Upload failed', icon: 'alert-circle-outline', colorKey: 'statusOverdue' },
};

const formatSize = (bytes?: number) => {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export interface AssignmentSubmissionCardProps extends StyleEscapeHatches, Pick<AnimatableProps, 'animated'> {
  submission: AssignmentSubmission;
  locale?: string;
  /** Opens the platform file picker — always available alongside drag-and-drop. */
  onPickFiles?: () => void;
  onRemoveFile?: (file: Attachment) => void;
  onSaveDraft?: () => void;
  onSubmit?: () => void;
  onResubmit?: () => void;
  submitting?: boolean;
  errorMessage?: string;
}

/**
 * Assignment upload and submission.
 *
 * Two copy rules from the spec are enforced here: a late submission is described
 * neutrally when the policy allows it (never as an error), and resubmission
 * warns explicitly when it will overwrite a previous score — that consequence is
 * confirmed, not buried in help text.
 *
 * File type and size limits are stated *before* the picker opens, because
 * discovering them after a failed 40 MB upload is a waste of the learner's time.
 */
export const AssignmentSubmissionCard = ({
  submission,
  locale = 'en-IN',
  onPickFiles,
  onRemoveFile,
  onSaveDraft,
  onSubmit,
  onResubmit,
  submitting = false,
  errorMessage,
  animated = true,
  style,
  containerStyle,
  testID,
}: AssignmentSubmissionCardProps) => {
  const theme = useAppTheme();
  const learn = useLearnTheme();
  const confirm = useConfirm();

  const id = testID ?? `assignment-${submission.assignmentId}`;
  const meta = STATUS_META[submission.status];
  const color = learn.colors[meta.colorKey];

  const dueInfo = useMemo(() => {
    if (!submission.dueAt) return null;
    const due = new Date(submission.dueAt);
    const overdue = due.getTime() < Date.now();
    const formatted = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(due);
    return { formatted, overdue };
  }, [locale, submission.dueAt]);

  const locked = submission.status === 'graded' && !onResubmit;
  const canSubmit = submission.files.length > 0 && !submitting && !locked;

  const limits = useMemo(
    () =>
      [
        submission.acceptedFileTypes?.length ? submission.acceptedFileTypes.join(', ') : undefined,
        submission.maxFileSizeBytes ? `up to ${formatSize(submission.maxFileSizeBytes)} each` : undefined,
        submission.maxFiles ? `maximum ${submission.maxFiles} files` : undefined,
      ]
        .filter(Boolean)
        .join(' · '),
    [submission],
  );

  /** Overwriting a graded attempt is confirmed, never silent. */
  const handleResubmit = useCallback(async () => {
    if (submission.resubmissionOverwrites) {
      const ok = await confirm({
        title: 'Replace your previous submission?',
        message:
          'Resubmitting replaces your previous attempt and its score. Your assignment returns to the queue for review.',
        confirmLabel: 'Replace submission',
        cancelLabel: 'Keep current',
      });
      if (!ok) return;
    }
    onResubmit?.();
  }, [confirm, onResubmit, submission.resubmissionOverwrites]);

  return (
    <AppCard variant="outlined" containerStyle={containerStyle} style={style} testID={id}>
      <View style={{ gap: theme.spacing.sm }}>
        <View style={styles.row}>
          <Text variant="titleSmall" style={styles.flex}>
            {submission.title}
          </Text>
          <View style={[styles.row, { gap: 3 }]}>
            <Icon source={meta.icon} size={13} color={color} />
            <Text variant="labelSmall" style={{ color }}>
              {meta.label}
            </Text>
          </View>
        </View>

        {/* Deadline stays visible throughout. */}
        {dueInfo ? (
          <View style={[styles.row, { gap: 4 }]}>
            <Icon
              source="calendar-clock"
              size={13}
              color={dueInfo.overdue ? learn.colors.statusLate : theme.colors.onSurfaceVariant}
            />
            <Text
              variant="labelSmall"
              style={{ color: dueInfo.overdue ? learn.colors.statusLate : theme.colors.onSurfaceVariant }}
            >
              Due {dueInfo.formatted}
              {dueInfo.overdue ? ' · deadline passed' : ''}
            </Text>
          </View>
        ) : null}

        {submission.instructions ? (
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {submission.instructions}
          </Text>
        ) : null}

        {/* Late policy stated plainly and without blame. */}
        {dueInfo?.overdue && submission.lateSubmissionsAllowed && submission.status !== 'graded' ? (
          <View
            style={[
              styles.notice,
              { backgroundColor: theme.colors.surfaceVariant, borderRadius: theme.radii.sm, padding: theme.spacing.sm },
            ]}
          >
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {submission.latePenaltyNote ?? 'Late submissions are accepted. A penalty may apply.'}
            </Text>
          </View>
        ) : null}

        <Divider style={{ marginVertical: theme.spacing.xs }} />

        {/* Upload area — the picker is a plain button, not drag-and-drop only. */}
        {!locked ? (
          <TouchableRipple
            onPress={onPickFiles}
            disabled={!onPickFiles || submitting}
            style={[
              styles.dropzone,
              { borderColor: theme.colors.outlineVariant, borderRadius: theme.radii.md, padding: theme.spacing.md },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Upload files for ${submission.title}${limits ? `. Accepted: ${limits}` : ''}`}
            testID={childTestID(id, 'picker')}
          >
            <View style={styles.center}>
              <Icon source="cloud-upload-outline" size={26} color={theme.colors.onSurfaceVariant} />
              <Text variant="labelMedium" style={{ marginTop: 4 }}>
                Upload file
              </Text>
              {/* Limits shown before selection, not after a failure. */}
              {limits ? (
                <Text
                  variant="labelSmall"
                  style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 2 }}
                >
                  {limits}
                </Text>
              ) : null}
            </View>
          </TouchableRipple>
        ) : null}

        {submission.files.length > 0 ? (
          <View style={{ gap: theme.spacing.xs }}>
            {submission.files.map((file) => {
              const failed = file.state === 'failed' || file.state === 'blocked';
              return (
                <View
                  key={file.id}
                  style={[
                    styles.fileRow,
                    {
                      borderColor: failed ? learn.colors.statusOverdue : theme.colors.outlineVariant,
                      borderRadius: theme.radii.md,
                      padding: theme.spacing.sm,
                      gap: theme.spacing.xs,
                    },
                  ]}
                  testID={childTestID(id, `file-${file.id}`)}
                >
                  <Icon
                    source={file.mimeType.startsWith('image/') ? 'image-outline' : 'file-document-outline'}
                    size={18}
                    color={failed ? learn.colors.statusOverdue : theme.colors.onSurfaceVariant}
                  />
                  <View style={styles.flex}>
                    <Text variant="labelMedium" numberOfLines={1}>
                      {file.name}
                    </Text>
                    <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      {formatSize(file.size)}
                      {file.state === 'scanning' ? ' · checking file' : ''}
                    </Text>
                    {file.state === 'uploading' && file.progress != null ? (
                      <ProgressBar
                        progress={file.progress}
                        style={{ height: 3, borderRadius: theme.radii.pill, marginTop: 4 }}
                        // Upload progress is announced, not just drawn.
                        accessibilityLabel={`Uploading ${file.name}, ${Math.round(file.progress * 100)} percent`}
                      />
                    ) : null}
                    {failed ? (
                      <Text variant="labelSmall" style={{ color: learn.colors.statusOverdue }}>
                        {file.blockedReason ?? 'Upload failed. Try again.'}
                      </Text>
                    ) : null}
                  </View>

                  {onRemoveFile && !locked ? (
                    <TouchableRipple
                      onPress={() => onRemoveFile(file)}
                      borderless
                      style={{ padding: 6, borderRadius: 20 }}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${file.name}`}
                      testID={childTestID(id, `remove-${file.id}`)}
                    >
                      <Icon source="close" size={16} color={theme.colors.onSurfaceVariant} />
                    </TouchableRipple>
                  ) : null}
                </View>
              );
            })}
          </View>
        ) : null}

        {errorMessage ? (
          <Text variant="labelSmall" style={{ color: learn.colors.statusOverdue }}>
            {errorMessage}
          </Text>
        ) : null}

        {submission.status === 'graded' || submission.grade ? (
          <View
            style={[
              styles.notice,
              { backgroundColor: learn.colors.surfaceSelected, borderRadius: theme.radii.md, padding: theme.spacing.sm, gap: 4 },
            ]}
            testID={childTestID(id, 'grade')}
          >
            <Text variant="labelSmall" style={{ color: learn.colors.onSurfaceSelected }}>
              Grade
            </Text>
            <Text variant="titleMedium" style={{ color: learn.colors.onSurfaceSelected }}>
              {submission.grade}
            </Text>
            {submission.feedback ? (
              <Text variant="bodySmall" style={{ color: learn.colors.onSurfaceSelected }}>
                {submission.feedback}
              </Text>
            ) : null}
          </View>
        ) : null}

        <View style={[styles.actions, { gap: theme.spacing.sm, marginTop: theme.spacing.xs }]}>
          {onSaveDraft && !locked && submission.status !== 'submitted' ? (
            <AppButton variant="ghost" size="sm" onPress={onSaveDraft} testID={childTestID(id, 'draft')}>
              Save draft
            </AppButton>
          ) : null}

          {submission.status === 'submitted' || submission.status === 'graded' || submission.status === 'late' ? (
            onResubmit ? (
              <AppButton
                variant="secondary"
                size="sm"
                containerStyle={styles.flex}
                onPress={() => void handleResubmit()}
                testID={childTestID(id, 'resubmit')}
              >
                Resubmit assignment
              </AppButton>
            ) : null
          ) : onSubmit ? (
            <AppButton
              variant="primary"
              size="sm"
              containerStyle={styles.flex}
              disabled={!canSubmit}
              loading={submitting}
              debounceMs={1000}
              onPress={onSubmit}
              testID={childTestID(id, 'submit')}
            >
              {dueInfo?.overdue && submission.lateSubmissionsAllowed ? 'Submit late' : 'Submit assignment'}
            </AppButton>
          ) : null}
        </View>

        {submission.submittedAt ? (
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            Your submission was received on{' '}
            {new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(
              new Date(submission.submittedAt),
            )}
            .
          </Text>
        ) : null}
      </View>
    </AppCard>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  center: { alignItems: 'center', justifyContent: 'center' },
  dropzone: { borderWidth: 1, borderStyle: 'dashed' },
  fileRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1 },
  notice: {},
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  flex: { flex: 1 },
});
