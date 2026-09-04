import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Checkbox, HelperText, Icon, ProgressBar, RadioButton, Text, TouchableRipple } from 'react-native-paper';
import Animated from 'react-native-reanimated';

import { AppButton } from '@ui/atoms/AppButton';
import { AppCard } from '@ui/molecules/AppCard';
import { useControllableState, useMotion, useShake, type AnimatableProps } from '@/hooks';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useLearnTheme } from '../theme/educationTokens';
import type { QuizMode, QuizOption, QuizQuestion } from '../types/domain';

export interface QuizQuestionCardProps extends StyleEscapeHatches, Pick<AnimatableProps, 'animated'> {
  question: QuizQuestion;
  /** 1-based. */
  questionNumber?: number;
  totalQuestions?: number;
  mode?: QuizMode;
  /** Selected option ids. Controlled so answers survive navigation. */
  value?: string[];
  defaultValue?: string[];
  onChange?: (selected: string[]) => void;
  /** Set once the answer is checked; drives review styling. */
  submitted?: boolean;
  /** Supplied by the grading service — never derived on the client in graded mode. */
  isCorrect?: boolean;
  onSubmit?: (selected: string[]) => void;
  onNext?: () => void;
  onPrevious?: () => void;
  attemptsRemaining?: number;
  /** Blocks interaction once the attempt window closes. */
  timedOut?: boolean;
  submitting?: boolean;
  errorMessage?: string;
  contextLabel?: string;
}

const INSTRUCTION: Record<QuizQuestion['type'], string> = {
  single: 'Choose one answer.',
  multiple: 'Select all that apply.',
  trueFalse: 'True or false?',
};

const TRUE_FALSE_OPTIONS: QuizOption[] = [
  { id: 'true', label: 'True' },
  { id: 'false', label: 'False' },
];

/**
 * A single quiz question.
 *
 * Practice and graded modes differ in one important way: practice corrects
 * immediately, graded withholds feedback until the answer is submitted and
 * scored server-side. Correctness is never computed here in graded mode — the
 * client does not hold the answer key.
 *
 * Feedback is icon + word + text, never colour alone, and answers persist when
 * the learner moves backward.
 */
export const QuizQuestionCard = ({
  question,
  questionNumber,
  totalQuestions,
  mode = 'graded',
  value,
  defaultValue = [],
  onChange,
  submitted = false,
  isCorrect,
  onSubmit,
  onNext,
  onPrevious,
  attemptsRemaining,
  timedOut = false,
  submitting = false,
  errorMessage,
  contextLabel,
  animated = true,
  style,
  containerStyle,
  testID,
}: QuizQuestionCardProps) => {
  const theme = useAppTheme();
  const learn = useLearnTheme();
  const motion = useMotion({ animated });
  const { style: shakeStyle, shake } = useShake(animated);

  const id = testID ?? `question-${question.id}`;
  const options = question.type === 'trueFalse' ? TRUE_FALSE_OPTIONS : (question.options ?? []);
  const multiple = question.type === 'multiple';
  const locked = submitted || timedOut;

  const [selected, setSelected] = useControllableState<string[]>({ value, defaultValue, onChange });

  const [validationError, setValidationError] = React.useState<string>();

  const toggle = useCallback(
    (optionId: string) => {
      if (locked) return;
      setValidationError(undefined);
      setSelected((prev) =>
        multiple
          ? prev.includes(optionId)
            ? prev.filter((current) => current !== optionId)
            : [...prev, optionId]
          : [optionId],
      );
    },
    [locked, multiple, setSelected],
  );

  const handleSubmit = useCallback(() => {
    if (selected.length === 0) {
      setValidationError('You must select at least one answer.');
      shake();
      return;
    }
    if (multiple && question.minSelections && selected.length < question.minSelections) {
      setValidationError(`Select at least ${question.minSelections} answers.`);
      shake();
      return;
    }
    onSubmit?.(selected);
  }, [multiple, onSubmit, question.minSelections, selected, shake]);

  /** Option feedback only exists in review — practice, or after submission. */
  const feedbackFor = useCallback(
    (option: QuizOption): 'correct' | 'incorrect' | 'missed' | null => {
      if (!submitted || option.correct == null) return null;
      const picked = selected.includes(option.id);
      if (option.correct && picked) return 'correct';
      if (!option.correct && picked) return 'incorrect';
      if (option.correct && !picked) return 'missed';
      return null;
    },
    [selected, submitted],
  );

  const resultBanner = useMemo(() => {
    if (!submitted || isCorrect == null) return null;
    return isCorrect
      ? { label: 'Correct', icon: 'check-circle', color: learn.colors.statusPassed }
      : { label: 'Not quite', icon: 'close-circle', color: learn.colors.statusFailed };
  }, [isCorrect, learn.colors, submitted]);

  return (
    <Animated.View style={[containerStyle, shakeStyle]} testID={id}>
      <AppCard variant="outlined" style={style}>
        <View style={{ gap: theme.spacing.sm }}>
          <View style={styles.row}>
            <View style={styles.flex}>
              {contextLabel ? (
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {contextLabel}
                </Text>
              ) : null}
              {questionNumber ? (
                <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                  Question {questionNumber}
                  {totalQuestions ? ` of ${totalQuestions}` : ''}
                  {question.required === false ? ' (optional)' : ''}
                </Text>
              ) : null}
            </View>
            {mode === 'practice' ? (
              <Text variant="labelSmall" style={{ color: learn.colors.statusInProgress }}>
                Practice
              </Text>
            ) : (
              <Text variant="labelSmall" style={{ color: learn.colors.statusPending }}>
                Graded
              </Text>
            )}
          </View>

          {questionNumber && totalQuestions ? (
            <ProgressBar
              progress={questionNumber / totalQuestions}
              style={{ height: 3, borderRadius: theme.radii.pill }}
              accessibilityLabel={`Question ${questionNumber} of ${totalQuestions}`}
            />
          ) : null}

          <Text variant="titleMedium" accessibilityRole="header">
            {question.prompt}
          </Text>

          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {INSTRUCTION[question.type]}
          </Text>

          {/* Answer group with proper radio/checkbox semantics. */}
          <View
            accessibilityRole={multiple ? 'list' : 'radiogroup'}
            accessibilityLabel={`${question.prompt}. ${INSTRUCTION[question.type]}`}
            style={{ gap: 2 }}
          >
            {options.map((option) => {
              const picked = selected.includes(option.id);
              const feedback = feedbackFor(option);

              const border =
                feedback === 'correct'
                  ? learn.colors.statusPassed
                  : feedback === 'incorrect'
                    ? learn.colors.statusFailed
                    : feedback === 'missed'
                      ? learn.colors.statusPending
                      : picked
                        ? learn.colors.statusInProgress
                        : theme.colors.outlineVariant;

              return (
                <TouchableRipple
                  key={option.id}
                  onPress={() => toggle(option.id)}
                  disabled={locked}
                  accessibilityRole={multiple ? 'checkbox' : 'radio'}
                  accessibilityState={{ checked: picked, selected: picked, disabled: locked }}
                  accessibilityLabel={`${option.label}${
                    feedback === 'correct'
                      ? ', your answer, correct'
                      : feedback === 'incorrect'
                        ? ', your answer, incorrect'
                        : feedback === 'missed'
                          ? ', correct answer you did not select'
                          : ''
                  }`}
                  style={[
                    styles.option,
                    {
                      borderColor: border,
                      borderWidth: picked || feedback ? 2 : 1,
                      borderRadius: theme.radii.md,
                      marginTop: theme.spacing.xs,
                    },
                  ]}
                  testID={childTestID(id, `option-${option.id}`)}
                >
                  <View style={[styles.row, { padding: theme.spacing.sm, gap: theme.spacing.xs }]}>
                    {multiple ? (
                      <Checkbox status={picked ? 'checked' : 'unchecked'} disabled={locked} onPress={() => toggle(option.id)} />
                    ) : (
                      <RadioButton
                        value={option.id}
                        status={picked ? 'checked' : 'unchecked'}
                        disabled={locked}
                        onPress={() => toggle(option.id)}
                      />
                    )}

                    <Text variant="bodyMedium" style={styles.flex}>
                      {option.label}
                    </Text>

                    {/* Icon + word, so correctness is never colour-only. */}
                    {feedback ? (
                      <View style={[styles.row, { gap: 3 }]}>
                        <Icon
                          source={
                            feedback === 'correct'
                              ? 'check-circle'
                              : feedback === 'incorrect'
                                ? 'close-circle'
                                : 'information'
                          }
                          size={16}
                          color={border}
                        />
                        <Text variant="labelSmall" style={{ color: border }}>
                          {feedback === 'correct' ? 'Correct' : feedback === 'incorrect' ? 'Incorrect' : 'Missed'}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </TouchableRipple>
              );
            })}
          </View>

          {validationError ? (
            <HelperText
              type="error"
              visible
              padding="none"
              // Announced, not just rendered.
              testID={childTestID(id, 'validation')}
            >
              {validationError}
            </HelperText>
          ) : null}

          {resultBanner ? (
            <View
              style={[styles.row, { gap: 6 }]}
              accessibilityLiveRegion="polite"
              testID={childTestID(id, 'result')}
            >
              <Icon source={resultBanner.icon} size={18} color={resultBanner.color} />
              <Text variant="titleSmall" style={{ color: resultBanner.color }}>
                {resultBanner.label}
              </Text>
            </View>
          ) : null}

          {submitted && question.explanation ? (
            <View
              style={[
                styles.explanation,
                { backgroundColor: theme.colors.surfaceVariant, borderRadius: theme.radii.md, padding: theme.spacing.sm },
              ]}
              testID={childTestID(id, 'explanation')}
            >
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Explanation
              </Text>
              <Text variant="bodySmall" style={{ marginTop: 2 }}>
                {question.explanation}
              </Text>
            </View>
          ) : null}

          {timedOut ? (
            <Text variant="labelSmall" style={{ color: learn.colors.statusOverdue }}>
              Your attempt has expired.
            </Text>
          ) : null}

          {errorMessage ? (
            <Text variant="labelSmall" style={{ color: learn.colors.statusOverdue }}>
              {errorMessage}
            </Text>
          ) : null}

          {attemptsRemaining != null && !submitted ? (
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              You have {attemptsRemaining} attempt{attemptsRemaining === 1 ? '' : 's'} remaining.
            </Text>
          ) : null}

          <View style={[styles.actions, { gap: theme.spacing.sm, marginTop: theme.spacing.xs }]}>
            {onPrevious ? (
              <AppButton variant="ghost" size="sm" onPress={onPrevious} testID={childTestID(id, 'previous')}>
                Back
              </AppButton>
            ) : null}

            {!submitted ? (
              <AppButton
                variant="primary"
                containerStyle={styles.flex}
                loading={submitting}
                disabled={timedOut}
                debounceMs={800}
                onPress={handleSubmit}
                testID={childTestID(id, 'submit')}
              >
                {mode === 'practice' ? 'Check answer' : 'Submit answer'}
              </AppButton>
            ) : onNext ? (
              <AppButton variant="primary" containerStyle={styles.flex} onPress={onNext} testID={childTestID(id, 'next')}>
                Next question
              </AppButton>
            ) : null}
          </View>
        </View>
      </AppCard>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  option: { overflow: 'hidden' },
  explanation: {},
  actions: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
});
