/**
 * USAGE — SymptomSelector
 *
 * Select "Chest pain or pressure" or "Difficulty breathing" to see the urgent
 * path: escalation appears at the top immediately and the caller pauses the
 * questionnaire rather than letting the user continue through it.
 */
import React, { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Text } from 'react-native-paper';

import { AppButton } from '@ui/atoms/AppButton';
import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { Symptom, SymptomSelection } from '../types/domain';
import { SymptomSelector } from './SymptomSelector';
import sample from './SymptomSelector.sample.json';

const data = loadSample<{
  symptoms: Symptom[];
  suggested: string[];
  recent: string[];
  contentVersion: string;
}>(sample);

export const SymptomSelectorUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();

  const [selections, setSelections] = useState<SymptomSelection[]>([]);
  const [paused, setPaused] = useState(false);
  const [caregiverMode, setCaregiverMode] = useState(false);

  /** The caller pauses the flow — the component only reports the trigger. */
  const handleUrgent = useCallback(
    (symptom: Symptom) => {
      setPaused(true);
      toast.error(`${symptom.label} needs urgent attention`);
    },
    [toast],
  );

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
      <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
        <AppButton variant="ghost" size="sm" onPress={() => setCaregiverMode((prev) => !prev)}>
          {caregiverMode ? 'Answering for myself' : 'Answering for my child'}
        </AppButton>
        {paused ? (
          <AppButton variant="ghost" size="sm" onPress={() => setPaused(false)}>
            Resume questionnaire
          </AppButton>
        ) : null}
      </View>

      {paused ? (
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
          The rest of the questionnaire is paused while an urgent symptom is selected. That decision belongs to the
          screen, not the component.
        </Text>
      ) : null}

      <SymptomSelector
        symptoms={data.symptoms}
        suggested={data.suggested}
        recent={data.recent}
        value={selections}
        onChange={setSelections}
        onUrgentTrigger={handleUrgent}
        onMissingSymptom={(text) => toast.success(`Noted: "${text.slice(0, 30)}…"`)}
        onCallEmergency={() => toast.error('Placing an emergency call (demo)')}
        emergencyNumber="112"
        subjectLabel={caregiverMode ? 'Aarav' : undefined}
        testID="symptoms"
      />

      <AppButton
        variant="primary"
        fullWidth
        disabled={selections.length === 0 || paused}
        onPress={() => toast.success(`Continuing with ${selections.length} symptoms · ${data.contentVersion}`)}
      >
        {paused ? 'Paused — please read the notice above' : 'Continue'}
      </AppButton>

      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }} selectable>
        {JSON.stringify(selections)}
      </Text>
    </ScrollView>
  );
};
