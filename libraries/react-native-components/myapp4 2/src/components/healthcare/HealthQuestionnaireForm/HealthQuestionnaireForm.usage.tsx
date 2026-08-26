/**
 * USAGE — HealthQuestionnaireForm
 *
 * Worth trying: answer "Yes" to the medication question (a new question appears),
 * and select "Chest pain or pressure" (escalation appears immediately rather
 * than at the end). Leaving the first question blank shows that answers survive
 * a failed validation.
 */
import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { Text } from 'react-native-paper';

import { AppCard } from '@ui/molecules/AppCard';
import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { Question, QuestionnaireSchema } from '../types/domain';
import { HealthQuestionnaireForm } from './HealthQuestionnaireForm';
import type { Answers, QuestionnaireDraft } from './questionnaireEngine';
import schemaJson from './HealthQuestionnaireForm.sample.json';

const schema = loadSample<QuestionnaireSchema>(schemaJson);

export const HealthQuestionnaireFormUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const [draft, setDraft] = useState<QuestionnaireDraft | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<Answers | null>(null);

  const handleSubmit = useCallback(
    async (answers: Answers, finalDraft: QuestionnaireDraft) => {
      setSubmitting(true);
      await new Promise((resolve) => setTimeout(resolve, 900));
      setSubmitting(false);
      setSubmitted(answers);
      // The schema version is logged with the clinical submission.
      toast.success(`Sent to your care team · schema ${finalDraft.schemaVersion}`);
    },
    [toast],
  );

  if (submitted) {
    return (
      <View style={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
        <AppCard variant="filled" title="Submitted">
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            Schema {schema.id} v{schema.version}. Draft answers are stored separately from the submission, so an
            abandoned form never looks like a clinical record.
          </Text>
          <Text variant="labelSmall" selectable style={{ marginTop: theme.spacing.sm }}>
            {JSON.stringify(submitted, null, 1)}
          </Text>
        </AppCard>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <HealthQuestionnaireForm
        schema={schema}
        initialAnswers={draft?.answers}
        onDraftChange={setDraft}
        onSaveAndExit={(next) => {
          setDraft(next);
          toast.show('Draft saved — you can finish this later');
        }}
        onUrgentAnswer={(question: Question) => toast.error(`Urgent: ${question.label}`)}
        onCallEmergency={() => toast.error('Placing an emergency call (demo)')}
        onSubmit={(answers, finalDraft) => void handleSubmit(answers, finalDraft)}
        submitting={submitting}
        emergencyNumber="112"
        testID="questionnaire"
      />
    </View>
  );
};
