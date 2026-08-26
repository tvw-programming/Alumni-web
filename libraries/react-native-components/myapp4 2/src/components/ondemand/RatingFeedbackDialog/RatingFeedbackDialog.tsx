import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Checkbox, Icon, Text, TextInput, TouchableRipple } from 'react-native-paper';

import { AppButton } from '@ui/atoms/AppButton';
import { AppSheet } from '@ui/organisms/AppSheet';
import { FilterChipGroup } from '@ui/molecules/FilterChipGroup';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useServiceTheme } from '../theme/ondemandTokens';
import type { Feedback, FeedbackTag, RatingSubject } from '../types/domain';

const VERBAL_LABELS = ['Very poor', 'Poor', 'Okay', 'Good', 'Excellent'];

export interface RatingFeedbackDialogProps extends StyleEscapeHatches {
  visible: boolean;
  subject: RatingSubject;
  /** Tags shown depend on the star value the user picked — resolve per-rating. */
  tagsForRating: (rating: number) => FeedbackTag[];
  submitting?: boolean;
  onDismiss: () => void;
  onSubmit: (feedback: Feedback) => void;
}

/**
 * A star radiogroup that is itself a complete, submittable answer — the
 * comment box and tags are optional refinements, never a gate in front of the
 * "Submit" button. Tags change with the rating (issue-flavoured below 4 stars,
 * praise-flavoured at 4-5) so the vocabulary always matches the sentiment.
 */
export const RatingFeedbackDialog = ({
  visible,
  subject,
  tagsForRating,
  submitting = false,
  onDismiss,
  onSubmit,
  style,
  containerStyle,
  testID,
}: RatingFeedbackDialogProps) => {
  const theme = useAppTheme();
  const service = useServiceTheme();
  const id = testID ?? 'rating-feedback-dialog';
  const [rating, setRating] = useState(0);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);

  const tags = useMemo(() => (rating > 0 ? tagsForRating(rating) : []), [rating, tagsForRating]);

  const reset = () => {
    setRating(0);
    setTagIds([]);
    setComment('');
    setIsPrivate(false);
  };

  const handleDismiss = () => {
    reset();
    onDismiss();
  };

  const handleSubmit = () => {
    if (rating === 0) return;
    onSubmit({
      subjectId: subject.id,
      rating,
      tagIds,
      comment: comment.trim() ? comment.trim() : undefined,
      isPrivate,
    });
    reset();
  };

  return (
    <AppSheet
      visible={visible}
      onDismiss={handleDismiss}
      variant="bottom"
      title={`Rate ${subject.name}`}
      dismissible={!submitting}
      scrollable
      style={style}
      containerStyle={containerStyle}
      testID={id}
      footer={
        <View style={{ gap: theme.spacing.xs }}>
          <AppButton
            variant="primary"
            size="lg"
            fullWidth
            disabled={rating === 0}
            loading={submitting}
            onPress={handleSubmit}
            testID={childTestID(id, 'submit')}
          >
            Submit
          </AppButton>
          <AppButton variant="ghost" size="md" fullWidth onPress={handleDismiss} disabled={submitting}>
            Not now
          </AppButton>
        </View>
      }
    >
      <View style={{ gap: theme.spacing.md }}>
        <View
          style={styles.starsRow}
          accessibilityRole="radiogroup"
          accessibilityLabel="Rate your experience, 1 to 5 stars"
        >
          {[1, 2, 3, 4, 5].map((value) => (
            <TouchableRipple
              key={value}
              onPress={() => setRating(value)}
              borderless
              accessibilityRole="radio"
              accessibilityState={{ checked: rating === value, selected: rating === value }}
              accessibilityLabel={`${value} star${value === 1 ? '' : 's'}, ${VERBAL_LABELS[value - 1]}`}
              style={styles.starButton}
              testID={childTestID(id, `star-${value}`)}
            >
              <Icon
                source={value <= rating ? 'star' : 'star-outline'}
                size={36}
                color={value <= rating ? service.colors.ratingFill : theme.colors.outlineVariant}
              />
            </TouchableRipple>
          ))}
        </View>
        {rating > 0 ? (
          <Text variant="titleSmall" style={{ textAlign: 'center', color: theme.colors.onSurface }} accessibilityLiveRegion="polite">
            {VERBAL_LABELS[rating - 1]}
          </Text>
        ) : (
          <Text variant="labelSmall" style={{ textAlign: 'center', color: theme.colors.onSurfaceVariant }}>
            Tap a star to rate
          </Text>
        )}

        {tags.length > 0 ? (
          <FilterChipGroup
            items={tags.map((t) => ({ key: t.id, label: t.label }))}
            selected={tagIds}
            onChange={setTagIds}
            mode="multi"
            scrollable={false}
            testID={childTestID(id, 'tags')}
          />
        ) : null}

        <TextInput
          mode="outlined"
          multiline
          numberOfLines={3}
          placeholder="Add more detail (optional)"
          value={comment}
          onChangeText={setComment}
          accessibilityLabel="Additional feedback, optional"
          testID={childTestID(id, 'comment')}
        />

        <TouchableRipple
          onPress={() => setIsPrivate((v) => !v)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: isPrivate }}
          accessibilityLabel="Keep this feedback private, only visible to our support team"
        >
          <View style={styles.privateRow}>
            <Checkbox status={isPrivate ? 'checked' : 'unchecked'} onPress={() => setIsPrivate((v) => !v)} />
            <Text variant="bodySmall" style={styles.flex}>
              Keep this private (only our support team sees it)
            </Text>
          </View>
        </TouchableRipple>
      </View>
    </AppSheet>
  );
};

const styles = StyleSheet.create({
  starsRow: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  starButton: { padding: 6 },
  privateRow: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
});
