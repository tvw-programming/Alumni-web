/**
 * USAGE — MultiStepFormWizard
 *
 * Step 1 ships with a live validation error to show the error-summary banner
 * — it stays above the fields it refers to, not scattered only inline.
 */
import React, { useState } from 'react';
import { View } from 'react-native';
import { Text, TextInput } from 'react-native-paper';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { WizardStatus, WizardStepMeta } from '../types/domain';
import { MultiStepFormWizard, type WizardStep } from './MultiStepFormWizard';
import sample from './MultiStepFormWizard.sample.json';

const { steps: stepMeta } = loadSample<{ steps: WizardStepMeta[] }>(sample);

export const MultiStepFormWizardUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const [activeStep, setActiveStep] = useState(0);
  const [completed, setCompleted] = useState<string[]>([]);
  const [projectName, setProjectName] = useState('');
  const [status, setStatus] = useState<WizardStatus>('idle');

  const steps: WizardStep[] = stepMeta.map((meta, index) => ({
    ...meta,
    errorSummary: index === 0 && !projectName ? ['Project name is required.'] : undefined,
    render: () => {
      if (index === 0) {
        return <TextInput mode="outlined" label="Project name" value={projectName} onChangeText={setProjectName} />;
      }
      if (index === 1) {
        return <Text variant="bodyMedium">Team assignment fields would render here.</Text>;
      }
      if (index === 2) {
        return <Text variant="bodyMedium">Budget and timeline fields would render here.</Text>;
      }
      return <Text variant="bodyMedium">Review: "{projectName || 'Untitled project'}"</Text>;
    },
  }));

  const handleStepChange = (index: number) => {
    if (index > activeStep && !completed.includes(steps[activeStep]!.id) && activeStep === 0 && !projectName) {
      toast.show('Fix the error before continuing');
      return;
    }
    if (index > activeStep) setCompleted((prev) => [...new Set([...prev, steps[activeStep]!.id])]);
    setActiveStep(index);
  };

  return (
    <View style={{ padding: theme.spacing.md }}>
      <MultiStepFormWizard
        steps={steps}
        activeStep={activeStep}
        completedStepIds={completed}
        status={status}
        onStepChange={handleStepChange}
        onSaveDraft={() => {
          setStatus('saving');
          setTimeout(() => {
            setStatus('success');
            toast.success('Draft saved');
          }, 600);
        }}
        onSubmit={() => {
          setStatus('submitting');
          setTimeout(() => {
            setStatus('success');
            toast.success('Project created');
          }, 900);
        }}
      />
    </View>
  );
};
