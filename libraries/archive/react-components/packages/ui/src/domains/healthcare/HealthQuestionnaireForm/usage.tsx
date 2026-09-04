import { HealthQuestionnaireForm, type QuestionnaireSchema } from './HealthQuestionnaireForm';
import sample from './sample.json';

export function HealthQuestionnaireFormUsage() {
  const schema = sample.schema as unknown as QuestionnaireSchema;

  return (
    <HealthQuestionnaireForm
      schema={schema}
      initialValues={sample.initialValues}
      // Drafts are stored, not just held in memory: a half-finished intake form
      // lost to a backgrounded tab is one the patient will not redo.
      onSaveDraft={async (values) => {
        await fetch(`/api/questionnaires/${schema.id}/draft`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ values, version: schema.version }),
        });
      }}
      onSubmit={async (values, version) => {
        const response = await fetch(`/api/questionnaires/${schema.id}/submissions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          // The version travels with the answers. Question 4 in v2 is not
          // question 4 in v3.
          body: JSON.stringify({ values, version }),
        });
        if (!response.ok) throw await response.json();
      }}
    />
  );
}
