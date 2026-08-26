import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Chip, Divider, HelperText, ProgressBar, RadioButton, Text } from 'react-native-paper';
import Animated from 'react-native-reanimated';

import { AppButton } from '@ui/atoms/AppButton';
import { AppTextInput } from '@ui/atoms/AppTextInput';
import { AppCard } from '@ui/molecules/AppCard';
import { useMotion, type AnimatableProps } from '@/hooks';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { UrgentEscalation } from '../primitives/ClinicalSafety';
import { useHealthTheme } from '../theme/healthcareTokens';
import type { Question, QuestionnaireSchema } from '../types/domain';
import {
  buildDraft,
  progressFor,
  urgentAnswers,
  validateSection,
  visibleQuestions,
  visibleSections,
  type Answers,
  type QuestionnaireDraft,
  type ValidationResult,
} from './questionnaireEngine';

export interface HealthQuestionnaireFormProps extends StyleEscapeHatches, Pick<AnimatableProps, 'animated'> {
  schema: QuestionnaireSchema;
  initialAnswers?: Answers;
  onSubmit: (answers: Answers, draft: QuestionnaireDraft) => void;
  /** Called on every change so the caller can persist a draft. */
  onDraftChange?: (draft: QuestionnaireDraft) => void;
  onSaveAndExit?: (draft: QuestionnaireDraft) => void;
  /** Fired when a clinically-authored urgent rule matches. */
  onUrgentAnswer?: (question: Question) => void;
  emergencyNumber?: string;
  onCallEmergency?: () => void;
  submitting?: boolean;
  /** Caregiver completing on someone else's behalf. */
  subjectLabel?: string;
}

/**
 * Schema-driven clinical intake.
 *
 * Three things the spec insists on and this enforces:
 * escape answers ("None", "Not sure", "Prefer not to answer") are rendered as
 * real options so nobody is forced into a false answer; answers survive a failed
 * validation; and progress is hidden entirely when branching makes the total
 * unreliable rather than shown as a number that will change.
 */
export const HealthQuestionnaireForm = ({
  schema,
  initialAnswers = {},
  onSubmit,
  onDraftChange,
  onSaveAndExit,
  onUrgentAnswer,
  emergencyNumber = '112',
  onCallEmergency,
  submitting = false,
  subjectLabel,
  animated = true,
  style,
  containerStyle,
  testID,
}: HealthQuestionnaireFormProps) => {
  const theme = useAppTheme();
  const health = useHealthTheme();
  const motion = useMotion({ animated });

  const [answers, setAnswers] = useState<Answers>(initialAnswers);
  const [sectionIndex, setSectionIndex] = useState(0);
  const [errors, setErrors] = useState<ValidationResult[]>([]);
  const [reviewing, setReviewing] = useState(false);

  const sections = useMemo(() => visibleSections(schema, answers), [answers, schema]);
  const section = sections[Math.min(sectionIndex, sections.length - 1)];
  const questions = useMemo(() => (section ? visibleQuestions(section, answers) : []), [answers, section]);
  const progress = useMemo(() => progressFor(schema, answers, sectionIndex), [answers, schema, sectionIndex]);
  const flagged = useMemo(() => urgentAnswers(schema, answers), [answers, schema]);

  const setAnswer = useCallback(
    (question: Question, value: unknown) => {
      setAnswers((prev) => {
        const next = { ...prev, [question.id]: value };
        onDraftChange?.(buildDraft(schema, next));
        return next;
      });
      // Clear this question's error as soon as it is answered.
      setErrors((prev) => prev.filter((error) => error.questionId !== question.id));

      const rule = question.urgentIf;
      if (rule) {
        const hit = rule.includes != null
          ? Array.isArray(value) && value.includes(rule.includes)
          : value === rule.equals;
        if (hit) onUrgentAnswer?.(question);
      }
    },
    [onDraftChange, onUrgentAnswer, schema],
  );

  const goNext = useCallback(() => {
    if (!section) return;
    const found = validateSection(section, answers);
    // Answers are preserved — validation never clears the section.
    setErrors(found);
    if (found.length > 0) return;

    if (sectionIndex >= sections.length - 1) setReviewing(true);
    else setSectionIndex((prev) => prev + 1);
  }, [answers, section, sectionIndex, sections.length]);

  const errorFor = useCallback(
    (questionId: string) => errors.find((error) => error.questionId === questionId)?.message,
    [errors],
  );

  const renderQuestion = (question: Question) => {
    const value = answers[question.id];
    const error = errorFor(question.id);

    return (
      <Animated.View key={question.id} layout={motion.layout} style={{ gap: theme.spacing.xs }}>
        <Text variant="titleSmall">
          {question.label}
          {question.required ? '' : ' (optional)'}
        </Text>
        {question.helpText ? (
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {question.helpText}
          </Text>
        ) : null}

        {question.type === 'singleSelect' || question.type === 'boolean' ? (
          <RadioButton.Group
            value={String(value ?? '')}
            onValueChange={(next) => setAnswer(question, next)}
          >
            {(question.options ?? []).map((option) => (
              <RadioButton.Item
                key={option.id}
                label={option.label}
                value={option.id}
                position="leading"
                accessibilityLabel={option.label}
                testID={childTestID(testID, `${question.id}-${option.id}`)}
              />
            ))}
          </RadioButton.Group>
        ) : question.type === 'multiSelect' ? (
          <View style={[styles.chips, { gap: theme.spacing.xs }]}>
            {(question.options ?? []).map((option) => {
              const list = Array.isArray(value) ? (value as string[]) : [];
              const selected = list.includes(option.id);
              return (
                <Chip
                  key={option.id}
                  selected={selected}
                  showSelectedCheck={selected}
                  onPress={() => {
                    // Picking an escape answer clears the others, and vice versa.
                    if (option.isEscapeAnswer) {
                      setAnswer(question, selected ? [] : [option.id]);
                      return;
                    }
                    const escapeIds = (question.options ?? []).filter((o) => o.isEscapeAnswer).map((o) => o.id);
                    const cleaned = list.filter((id) => !escapeIds.includes(id));
                    setAnswer(question, selected ? cleaned.filter((id) => id !== option.id) : [...cleaned, option.id]);
                  }}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}
                  testID={childTestID(testID, `${question.id}-${option.id}`)}
                >
                  {option.label}
                </Chip>
              );
            })}
          </View>
        ) : (
          <AppTextInput
            value={value != null ? String(value) : ''}
            onChangeText={(text) => setAnswer(question, question.type === 'number' ? Number.parseFloat(text) || '' : text)}
            keyboardType={question.type === 'number' ? 'decimal-pad' : 'default'}
            multiline={question.type === 'longText'}
            numberOfLines={question.type === 'longText' ? 4 : 1}
            placeholder={question.placeholder}
            label={question.unit ? `Value (${question.unit})` : undefined}
            error={!!error}
            errorText={error}
            testID={childTestID(testID, question.id)}
          />
        )}

        {error && question.type !== 'text' && question.type !== 'number' && question.type !== 'longText' ? (
          <HelperText type="error" visible padding="none" testID={childTestID(testID, `${question.id}-error`)}>
            {error}
          </HelperText>
        ) : null}

        <Divider style={{ marginTop: theme.spacing.sm }} />
      </Animated.View>
    );
  };

  if (reviewing) {
    return (
      <ScrollView contentContainerStyle={[{ padding: theme.spacing.md, gap: theme.spacing.md }, containerStyle]} testID={childTestID(testID, 'review')}>
        <Text variant="titleMedium">Check your answers</Text>
        {flagged.length > 0 ? (
          <UrgentEscalation
            emergencyNumber={emergencyNumber}
            title="Some answers may need urgent care"
            message={`You told us about ${flagged.map((q) => q.label.toLowerCase()).join('; ')}. If this is severe or getting worse, call ${emergencyNumber} now rather than waiting for your appointment.`}
            onCallEmergency={onCallEmergency}
            variant="blocking"
          />
        ) : null}

        {sections.map((item) => (
          <AppCard key={item.id} variant="outlined" title={item.title}>
            {visibleQuestions(item, answers).map((question) => (
              <View key={question.id} style={{ marginTop: theme.spacing.xs }}>
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {question.label}
                </Text>
                <Text variant="bodyMedium">
                  {Array.isArray(answers[question.id])
                    ? (answers[question.id] as string[])
                        .map((id) => question.options?.find((o) => o.id === id)?.label ?? id)
                        .join(', ') || 'Not answered'
                    : question.options?.find((o) => o.id === answers[question.id])?.label ??
                      (answers[question.id] != null && answers[question.id] !== ''
                        ? String(answers[question.id])
                        : 'Not answered')}
                </Text>
              </View>
            ))}
          </AppCard>
        ))}

        <AppButton
          variant="primary"
          size="lg"
          fullWidth
          loading={submitting}
          debounceMs={1200}
          onPress={() => onSubmit(answers, buildDraft(schema, answers))}
          testID={childTestID(testID, 'submit')}
        >
          Submit to my care team
        </AppButton>
        <AppButton variant="ghost" fullWidth onPress={() => setReviewing(false)}>
          Go back and edit
        </AppButton>
      </ScrollView>
    );
  }

  return (
    <View style={[styles.flex, containerStyle, style]} testID={testID}>
      <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
        {flagged.length > 0 ? (
          <UrgentEscalation
            emergencyNumber={emergencyNumber}
            onCallEmergency={onCallEmergency}
            testID={childTestID(testID, 'escalation')}
          />
        ) : null}

        {/* Progress only when the total is genuinely reliable. */}
        {progress ? (
          <View style={{ gap: 4 }}>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Step {progress.current} of {progress.total}
            </Text>
            <ProgressBar
              progress={progress.current / progress.total}
              style={{ height: 4, borderRadius: theme.radii.pill }}
              accessibilityLabel={`Step ${progress.current} of ${progress.total}`}
            />
          </View>
        ) : (
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            The questions you see depend on your answers, so we cannot say exactly how many are left.
          </Text>
        )}

        {section ? (
          <>
            <View>
              <Text variant="titleMedium" accessibilityRole="header">
                {section.title}
              </Text>
              {subjectLabel ? (
                <Text variant="labelSmall" style={{ color: health.colors.onSurfaceCalm }}>
                  You are answering for {subjectLabel}
                </Text>
              ) : null}
              {section.description ? (
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                  {section.description}
                </Text>
              ) : null}
            </View>

            {questions.map(renderQuestion)}
          </>
        ) : null}

        {schema.privacyNote ? (
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {schema.privacyNote}
          </Text>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { padding: theme.spacing.md, gap: theme.spacing.sm, borderTopColor: theme.colors.outlineVariant }]}>
        {errors.length > 0 ? (
          <Text variant="labelSmall" style={{ color: health.colors.urgentAccent }} accessibilityLiveRegion="assertive">
            Please check {errors.length} answer{errors.length === 1 ? '' : 's'} above. Nothing you typed has been lost.
          </Text>
        ) : null}

        <View style={[styles.row, { gap: theme.spacing.sm }]}>
          <AppButton
            variant="ghost"
            disabled={sectionIndex === 0}
            onPress={() => setSectionIndex((prev) => Math.max(0, prev - 1))}
            testID={childTestID(testID, 'back')}
          >
            Back
          </AppButton>
          <AppButton variant="primary" containerStyle={styles.flex} onPress={goNext} testID={childTestID(testID, 'next')}>
            {sectionIndex >= sections.length - 1 ? 'Review answers' : 'Next'}
          </AppButton>
        </View>

        {onSaveAndExit ? (
          <AppButton
            variant="ghost"
            fullWidth
            onPress={() => onSaveAndExit(buildDraft(schema, answers))}
            testID={childTestID(testID, 'save-exit')}
          >
            Save and finish later
          </AppButton>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
  footer: { borderTopWidth: StyleSheet.hairlineWidth },
});
