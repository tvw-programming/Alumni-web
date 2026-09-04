/**
 * USAGE — QuizResultCard
 *
 * Compare "nearMiss" and "clearFail": both failed, but the copy differs and
 * neither congratulates the learner. That distinction is the reason the summary
 * text lives in the component rather than being passed in as a prop.
 */
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SegmentedButtons, Text } from 'react-native-paper';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { QuizResult } from '../types/domain';
import { QuizResultCard } from './QuizResultCard';
import sample from './QuizResultCard.sample.json';

const { results } = loadSample<{ results: Record<string, QuizResult> }>(sample);
type ResultKey = 'passed' | 'nearMiss' | 'clearFail' | 'noAttemptsLeft' | 'pending' | 'syncError';

export const QuizResultCardUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const [key, setKey] = useState<ResultKey>('passed');
  const [loading, setLoading] = useState(false);

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
      <SegmentedButtons
        value={key}
        onValueChange={(next) => setKey(next as ResultKey)}
        density="small"
        buttons={[
          { value: 'passed', label: 'Passed' },
          { value: 'nearMiss', label: 'Close' },
          { value: 'clearFail', label: 'Failed' },
          { value: 'pending', label: 'Pending' },
        ]}
      />

      <QuizResultCard
        result={results[key]!}
        quizTitle="Module 2 · Graded quiz: Linear regression"
        loading={loading}
        xpEarned={key === 'passed' ? 40 : undefined}
        onReviewAnswers={() => toast.show('Opening answer review')}
        onRetake={() => {
          setLoading(true);
          setTimeout(() => {
            setLoading(false);
            toast.show('New attempt started');
          }, 900);
        }}
        onNextLesson={() => toast.success('Moving to the next lesson')}
        onViewCertificate={() => toast.show('Opening your certificate')}
        onRetrySync={() => toast.show('Retrying sync')}
        testID="quiz-result"
      />

      <Text variant="labelLarge">Remaining states</Text>
      <QuizResultCard result={results.noAttemptsLeft!} quizTitle="No attempts left" onReviewAnswers={() => {}} testID="result-no-attempts" />
      <QuizResultCard result={results.syncError!} quizTitle="Offline attempt" onRetrySync={() => toast.show('Retrying')} testID="result-error" />

      <View style={{ height: theme.spacing.xl }} />
    </ScrollView>
  );
};
