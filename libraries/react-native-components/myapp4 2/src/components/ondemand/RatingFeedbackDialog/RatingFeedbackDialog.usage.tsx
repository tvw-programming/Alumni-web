/**
 * USAGE — RatingFeedbackDialog
 *
 * Submit becomes enabled the moment a star is picked — tags and the comment
 * box never gate it, matching "don't force a public comment for a rating".
 */
import React, { useState } from 'react';
import { View } from 'react-native';
import { Text } from 'react-native-paper';

import { AppButton } from '@ui/atoms/AppButton';
import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { Feedback, FeedbackTag, RatingSubject } from '../types/domain';
import { RatingFeedbackDialog } from './RatingFeedbackDialog';
import rawSample from './RatingFeedbackDialog.sample.json';

const sample = loadSample<{ subject: RatingSubject; tagsByRating: Record<string, FeedbackTag[]> }>(rawSample);

export const RatingFeedbackDialogUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const [visible, setVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (feedback: Feedback) => {
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setVisible(false);
      toast.success(`Thanks! You rated ${feedback.rating}/5${feedback.isPrivate ? ' (private)' : ''}`);
    }, 700);
  };

  return (
    <View style={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
      <Text variant="bodyMedium">Rate your recent booking with {sample.subject.name}.</Text>
      <AppButton variant="primary" onPress={() => setVisible(true)}>
        Rate this booking
      </AppButton>

      <RatingFeedbackDialog
        visible={visible}
        subject={sample.subject}
        tagsForRating={(rating) => sample.tagsByRating[String(rating)] ?? []}
        submitting={submitting}
        onDismiss={() => setVisible(false)}
        onSubmit={handleSubmit}
      />
    </View>
  );
};
