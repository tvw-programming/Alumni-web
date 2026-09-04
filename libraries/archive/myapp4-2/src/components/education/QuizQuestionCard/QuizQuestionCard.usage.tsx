/**
 * USAGE — QuizQuestionCard
 *
 * Practice mode corrects immediately from the local answer key; graded mode
 * sends the answer to a (simulated) server and only then reveals the verdict.
 * Moving backward preserves what was already selected.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SegmentedButtons, Text } from 'react-native-paper';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { QuizMode, QuizQuestion } from '../types/domain';
import { QuizQuestionCard } from './QuizQuestionCard';
import sample from './QuizQuestionCard.sample.json';

const data = loadSample<{ practiceQuestions: QuizQuestion[]; gradedQuestion: QuizQuestion }>(sample);

export const QuizQuestionCardUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();

  const [mode, setMode] = useState<QuizMode>('practice');
  const [index, setIndex] = useState(0);
  /** Answers are kept per question, so going back never loses work. */
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [submittedIds, setSubmittedIds] = useState<string[]>([]);
  const [correctness, setCorrectness] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);

  const questions = mode === 'practice' ? data.practiceQuestions : [data.gradedQuestion];
  const question = questions[Math.min(index, questions.length - 1)]!;
  const submitted = submittedIds.includes(question.id);

  const grade = useCallback(
    async (selected: string[]) => {
      if (mode === 'practice') {
        // Practice has the key locally, so it can correct instantly.
        const correctIds = (question.options ?? []).filter((o) => o.correct).map((o) => o.id);
        const exact =
          correctIds.length === selected.length && correctIds.every((cid) => selected.includes(cid));
        setCorrectness((prev) => ({ ...prev, [question.id]: exact }));
        setSubmittedIds((prev) => [...prev, question.id]);
        return;
      }

      // Graded mode: the server holds the key.
      setSubmitting(true);
      await new Promise((resolve) => setTimeout(resolve, 900));
      setSubmitting(false);
      setCorrectness((prev) => ({ ...prev, [question.id]: selected[0] === 'a' }));
      setSubmittedIds((prev) => [...prev, question.id]);
      toast.show('Answer submitted for grading');
    },
    [mode, question, toast],
  );

  const trueFalseWithKey = useMemo(
    () =>
      question.type === 'trueFalse'
        ? { ...question, options: [
            { id: 'true', label: 'True' },
            { id: 'false', label: 'False', correct: true },
          ] }
        : question,
    [question],
  );

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
      <SegmentedButtons
        value={mode}
        onValueChange={(next) => {
          setMode(next as QuizMode);
          setIndex(0);
        }}
        density="small"
        buttons={[
          { value: 'practice', label: 'Practice' },
          { value: 'graded', label: 'Graded' },
        ]}
      />

      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
        {mode === 'practice'
          ? 'Practice corrects immediately and lets you retry. The answer key is available locally.'
          : 'Graded sends your answer to the server and waits. The client never receives the key — note the sample has no `correct` flags.'}
      </Text>

      <QuizQuestionCard
        question={mode === 'practice' ? trueFalseWithKey : question}
        questionNumber={index + 1}
        totalQuestions={questions.length}
        mode={mode}
        contextLabel="Module 2 · Linear Regression"
        value={answers[question.id] ?? []}
        onChange={(selected) => setAnswers((prev) => ({ ...prev, [question.id]: selected }))}
        submitted={submitted}
        isCorrect={correctness[question.id]}
        submitting={submitting}
        attemptsRemaining={mode === 'graded' ? 2 : undefined}
        onSubmit={(selected) => void grade(selected)}
        onPrevious={index > 0 ? () => setIndex((prev) => prev - 1) : undefined}
        onNext={
          index < questions.length - 1
            ? () => setIndex((prev) => prev + 1)
            : () => toast.success('Quiz finished')
        }
        testID="quiz-question"
      />

      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }} selectable>
        Answers so far: {JSON.stringify(answers)}
      </Text>
    </ScrollView>
  );
};
