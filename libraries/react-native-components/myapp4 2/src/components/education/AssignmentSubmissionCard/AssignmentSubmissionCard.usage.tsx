/**
 * USAGE — AssignmentSubmissionCard
 *
 * Try "Graded" then Resubmit: because `resubmissionOverwrites` is true, the
 * consequence is confirmed before anything is replaced. The "Late" case shows
 * neutral policy copy rather than treating a permitted late submission as an error.
 */
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SegmentedButtons, Text } from 'react-native-paper';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { AssignmentSubmission } from '../types/domain';
import { AssignmentSubmissionCard } from './AssignmentSubmissionCard';
import sample from './AssignmentSubmissionCard.sample.json';

const { submissions } = loadSample<{ submissions: Record<string, AssignmentSubmission> }>(sample);
type Key = 'notStarted' | 'uploading' | 'rejectedFile' | 'lateAllowed' | 'submitted' | 'graded' | 'revisionRequired';

export const AssignmentSubmissionCardUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();

  const [key, setKey] = useState<Key>('notStarted');
  const [submitting, setSubmitting] = useState(false);

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
      <SegmentedButtons
        value={key}
        onValueChange={(next) => setKey(next as Key)}
        density="small"
        buttons={[
          { value: 'notStarted', label: 'New' },
          { value: 'uploading', label: 'Upload' },
          { value: 'rejectedFile', label: 'Rejected' },
          { value: 'lateAllowed', label: 'Late' },
        ]}
      />
      <SegmentedButtons
        value={key}
        onValueChange={(next) => setKey(next as Key)}
        density="small"
        buttons={[
          { value: 'submitted', label: 'Submitted' },
          { value: 'graded', label: 'Graded' },
          { value: 'revisionRequired', label: 'Revision' },
        ]}
      />

      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
        Accepted file types and the size limit are shown before the picker opens — discovering them after a failed 88 MB
        upload wastes the learner's time.
      </Text>

      <AssignmentSubmissionCard
        submission={submissions[key]!}
        submitting={submitting}
        onPickFiles={() => toast.show('Opening the file picker')}
        onRemoveFile={(file) => toast.show(`Removed ${file.name}`)}
        onSaveDraft={() => toast.success('Draft saved — you can come back to this')}
        onSubmit={async () => {
          setSubmitting(true);
          await new Promise((resolve) => setTimeout(resolve, 900));
          setSubmitting(false);
          toast.success('Your submission was received');
        }}
        onResubmit={() => toast.success('Resubmitted — back in the review queue')}
        testID="assignment"
      />

      <View style={{ height: theme.spacing.xl }} />
    </ScrollView>
  );
};
