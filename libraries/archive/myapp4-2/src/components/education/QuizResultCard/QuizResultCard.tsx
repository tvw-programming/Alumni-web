import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Chip, Divider, Icon, Text } from 'react-native-paper';
import Animated from 'react-native-reanimated';

import { AppButton } from '@ui/atoms/AppButton';
import { AppCard } from '@ui/molecules/AppCard';
import { StateView } from '@ui/molecules/StateView';
import { useMotion, type AnimatableProps } from '@/hooks';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { ProgressRing } from '../Progress/ProgressRing';
import { useLearnTheme } from '../theme/educationTokens';
import type { QuizResult } from '../types/domain';

const STATUS_META = {
  passed: { title: 'You passed', icon: 'check-circle', colorKey: 'statusPassed' as const },
  failed: { title: 'Keep practising', icon: 'refresh-circle', colorKey: 'statusFailed' as const },
  pending: { title: 'Awaiting instructor review', icon: 'clock-outline', colorKey: 'statusPending' as const },
  error: { title: "Your result hasn't synced yet", icon: 'cloud-alert', colorKey: 'statusOverdue' as const },
};

export interface QuizResultCardProps extends StyleEscapeHatches, Pick<AnimatableProps, 'animated'> {
  result: QuizResult;
  quizTitle?: string;
  onReviewAnswers?: () => void;
  onRetake?: () => void;
  onNextLesson?: () => void;
  onViewCertificate?: () => void;
  onRetrySync?: () => void;
  /** XP or points earned — the playful layer, kept optional. */
  xpEarned?: number;
  loading?: boolean;
}

/**
 * The result screen.
 *
 * Copy accuracy is the point here. A learner who did not pass gets "You're
 * close — review these topics and try again", never "Great job!". Vague praise
 * after a failure reads as either sarcasm or a bug, and it destroys trust in
 * every other message the product sends.
 *
 * The number leads; the ring is secondary and is never the only representation.
 */
export const QuizResultCard = ({
  result,
  quizTitle,
  onReviewAnswers,
  onRetake,
  onNextLesson,
  onViewCertificate,
  onRetrySync,
  xpEarned,
  loading = false,
  animated = true,
  style,
  containerStyle,
  testID,
}: QuizResultCardProps) => {
  const theme = useAppTheme();
  const learn = useLearnTheme();
  const motion = useMotion({ animated });

  const meta = STATUS_META[result.status];
  const color = learn.colors[meta.colorKey];
  const passed = result.status === 'passed';
  const canRetake = (result.attemptsRemaining ?? 0) > 0 && !passed;

  /** Encouraging but accurate. */
  const summary = useMemo(() => {
    switch (result.status) {
      case 'passed':
        return `You scored ${result.percentage}%${
          result.passingPercentage != null ? `, above the ${result.passingPercentage}% passing score` : ''
        }.`;
      case 'failed':
        return result.percentage >= (result.passingPercentage ?? 70) - 10
          ? "You're close. Review the topics below and try again."
          : 'Review the topics below, then take another attempt when you feel ready.';
      case 'pending':
        return 'We saved your attempt. Your instructor will review it and release a score.';
      default:
        return result.errorMessage ?? 'We saved your attempt, but the score is still processing.';
    }
  }, [result]);

  if (loading) {
    return (
      <AppCard variant="outlined" containerStyle={containerStyle} testID={childTestID(testID, 'loading')}>
        <View style={[styles.center, { padding: theme.spacing.lg, gap: theme.spacing.sm }]}>
          <ActivityIndicator />
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            Scoring your attempt…
          </Text>
        </View>
      </AppCard>
    );
  }

  if (result.status === 'error') {
    return (
      <AppCard variant="outlined" containerStyle={containerStyle} style={style} testID={testID}>
        <StateView
          preset="offline"
          compact
          title={meta.title}
          description={summary}
          primaryAction={onRetrySync ? { label: 'Try again when online', onPress: onRetrySync } : undefined}
          secondaryAction={onReviewAnswers ? { label: 'Review answers', onPress: onReviewAnswers } : undefined}
        />
      </AppCard>
    );
  }

  return (
    <Animated.View entering={motion.entering('scale')} style={containerStyle}>
      <AppCard variant="outlined" style={style} testID={testID}>
        <View
          style={{ gap: theme.spacing.sm }}
          accessible
          accessibilityRole="summary"
          // The whole result as one spoken sentence.
          accessibilityLiveRegion="polite"
          accessibilityLabel={`${meta.title}. ${summary} ${
            result.correctCount != null ? `${result.correctCount} of ${result.totalCount} correct.` : ''
          }`}
        >
          {quizTitle ? (
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {quizTitle}
            </Text>
          ) : null}

          <View style={[styles.headline, { gap: theme.spacing.md }]}>
            <View style={styles.flex}>
              {/* The number leads. */}
              <Text variant="displaySmall" style={[styles.tabular, { color }]}>
                {result.status === 'pending' ? '—' : `${result.percentage}%`}
              </Text>
              <View style={[styles.row, { gap: 4 }]}>
                <Icon source={meta.icon} size={18} color={color} />
                <Text variant="titleSmall" style={{ color }}>
                  {meta.title}
                </Text>
              </View>
              {result.status !== 'pending' ? (
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Score: {result.score} of {result.maxScore}
                  {result.passingPercentage != null ? ` · Passing score: ${result.passingPercentage}%` : ''}
                </Text>
              ) : null}
            </View>

            {result.status !== 'pending' ? (
              <ProgressRing
                progress={{
                  value: result.percentage,
                  label: `${quizTitle ?? 'Quiz'} score`,
                  status: passed ? 'complete' : 'inProgress',
                }}
                size={84}
                strokeWidth={7}
                compact
                animated={animated}
                testID={childTestID(testID, 'ring')}
              />
            ) : null}
          </View>

          <Text variant="bodyMedium">{summary}</Text>

          <Divider style={{ marginVertical: theme.spacing.xs }} />

          <View style={[styles.stats, { gap: theme.spacing.md }]}>
            {result.correctCount != null && result.totalCount != null ? (
              <Stat label="Correct" value={`${result.correctCount} of ${result.totalCount}`} />
            ) : null}
            {result.attemptsUsed != null ? (
              <Stat label="Attempt" value={`${result.attemptsUsed}`} />
            ) : null}
            {result.completedInSeconds != null ? (
              <Stat
                label="Time"
                value={`${Math.floor(result.completedInSeconds / 60)}m ${result.completedInSeconds % 60}s`}
              />
            ) : null}
            {xpEarned != null ? <Stat label="XP earned" value={`+${xpEarned}`} /> : null}
          </View>

          {result.weakTopics?.length ? (
            <View style={{ gap: theme.spacing.xs, marginTop: theme.spacing.xs }}>
              <Text variant="labelMedium">Topics to review</Text>
              <View style={[styles.chips, { gap: theme.spacing.xs }]}>
                {result.weakTopics.map((topic) => (
                  <Chip key={topic} compact icon="book-open-variant">
                    {topic}
                  </Chip>
                ))}
              </View>
            </View>
          ) : null}

          {result.attemptsRemaining != null && !passed ? (
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {result.attemptsRemaining === 0
                ? 'No attempts remaining. Contact your instructor if you need another.'
                : `You have ${result.attemptsRemaining} attempt${result.attemptsRemaining === 1 ? '' : 's'} remaining.`}
            </Text>
          ) : null}

          <View style={[styles.actions, { gap: theme.spacing.sm, marginTop: theme.spacing.sm }]}>
            {passed && onNextLesson ? (
              <AppButton variant="primary" containerStyle={styles.flex} onPress={onNextLesson} testID={childTestID(testID, 'next')}>
                Next lesson
              </AppButton>
            ) : null}

            {canRetake && onRetake ? (
              <AppButton variant="primary" containerStyle={styles.flex} onPress={onRetake} testID={childTestID(testID, 'retake')}>
                Retake quiz
              </AppButton>
            ) : null}

            {onReviewAnswers ? (
              <AppButton variant="secondary" onPress={onReviewAnswers} testID={childTestID(testID, 'review')}>
                Review answers
              </AppButton>
            ) : null}
          </View>

          {result.certificateEligible && onViewCertificate ? (
            <AppButton
              variant="ghost"
              fullWidth
              icon="certificate-outline"
              onPress={onViewCertificate}
              testID={childTestID(testID, 'certificate')}
            >
              You're eligible for a certificate
            </AppButton>
          ) : null}
        </View>
      </AppCard>
    </Animated.View>
  );
};

const Stat = ({ label, value }: { label: string; value: string }) => {
  const theme = useAppTheme();
  return (
    <View>
      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
        {label}
      </Text>
      <Text variant="titleSmall" style={styles.tabular}>
        {value}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  headline: { flexDirection: 'row', alignItems: 'center' },
  stats: { flexDirection: 'row', flexWrap: 'wrap' },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  center: { alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  tabular: { fontVariant: ['tabular-nums'] },
});
