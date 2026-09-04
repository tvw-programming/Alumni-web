import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Icon, ProgressBar, Text, TouchableRipple } from 'react-native-paper';

import { AppButton } from '@ui/atoms/AppButton';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useWorkspaceTheme } from '../theme/enterpriseTokens';
import type { WizardStatus, WizardStepMeta } from '../types/domain';

export interface WizardStep extends WizardStepMeta {
  render: () => React.ReactNode;
  errorSummary?: string[];
}

export interface MultiStepFormWizardProps extends StyleEscapeHatches {
  steps: WizardStep[];
  activeStep: number;
  completedStepIds: string[];
  status?: WizardStatus;
  allowJumpAhead?: boolean;
  onStepChange: (index: number) => void;
  onSubmit: () => void;
  onSaveDraft?: () => void;
}

/**
 * The visual step indicator is never the only way to understand progress —
 * "Step 2 of 5" is always rendered as real text, and an error summary always
 * appears above the fields it refers to rather than being scattered only
 * inline where it might scroll out of view.
 */
export const MultiStepFormWizard = ({ steps, activeStep, completedStepIds, status = 'idle', allowJumpAhead = false, onStepChange, onSubmit, onSaveDraft, style, containerStyle, testID }: MultiStepFormWizardProps) => {
  const theme = useAppTheme();
  const enterprise = useWorkspaceTheme();
  const id = testID ?? 'multi-step-form-wizard';
  const step = steps[activeStep];
  const isLast = activeStep === steps.length - 1;
  const submitting = status === 'submitting';
  const saving = status === 'saving';

  if (!step) return null;

  return (
    <View style={[containerStyle, style]} testID={id}>
      <Text variant="labelMedium" style={{ color: enterprise.colors.onSurfaceVariant }} accessibilityLiveRegion="polite">
        Step {activeStep + 1} of {steps.length}
      </Text>

      <ProgressBar progress={(activeStep + 1) / steps.length} color={theme.colors.primary} style={{ height: 4, borderRadius: 2, marginTop: 4, marginBottom: theme.spacing.sm, backgroundColor: enterprise.colors.surfaceVariant }} />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: theme.spacing.sm }}>
        {steps.map((s, index) => {
          const completed = completedStepIds.includes(s.id);
          const current = index === activeStep;
          const reachable = allowJumpAhead || completed || index <= activeStep;
          return (
            <TouchableRipple
              key={s.id}
              onPress={reachable ? () => onStepChange(index) : undefined}
              disabled={!reachable}
              accessibilityRole="tab"
              accessibilityState={{ selected: current, disabled: !reachable }}
              accessibilityLabel={`${s.title}${s.optional ? ', optional' : ''}${completed ? ', completed' : current ? ', current step' : ''}`}
              style={[styles.stepChip, { borderRadius: theme.radii.pill, backgroundColor: current ? enterprise.colors.selected : enterprise.colors.surfaceVariant, opacity: reachable ? 1 : 0.5 }]}
              testID={childTestID(id, `step-${s.id}`)}
            >
              <View style={styles.row}>
                {completed ? <Icon source="check-circle" size={13} color={enterprise.colors.success} /> : null}
                <Text variant="labelSmall" style={{ color: current ? enterprise.colors.onSelected : enterprise.colors.onSurfaceVariant, marginLeft: completed ? 4 : 0 }}>
                  {s.title}
                  {s.optional ? ' (optional)' : ''}
                </Text>
              </View>
            </TouchableRipple>
          );
        })}
      </ScrollView>

      <Text variant="titleMedium" accessibilityRole="header" style={{ marginTop: theme.spacing.sm }}>
        {step.title}
      </Text>
      {step.description ? (
        <Text variant="bodySmall" style={{ color: enterprise.colors.onSurfaceVariant, marginTop: 2 }}>
          {step.description}
        </Text>
      ) : null}

      {step.errorSummary && step.errorSummary.length > 0 ? (
        <View style={[styles.errorBox, { backgroundColor: theme.colors.errorContainer, borderRadius: theme.radii.sm }]} accessibilityRole="alert">
          <Text variant="labelMedium" style={{ color: theme.colors.onErrorContainer }}>
            Fix {step.errorSummary.length} error{step.errorSummary.length === 1 ? '' : 's'} before continuing
          </Text>
          {step.errorSummary.map((err, i) => (
            <Text key={i} variant="labelSmall" style={{ color: theme.colors.onErrorContainer }}>
              • {err}
            </Text>
          ))}
        </View>
      ) : null}

      <View style={{ marginTop: theme.spacing.md }}>{step.render()}</View>

      <View style={[styles.footerRow, { marginTop: theme.spacing.lg }]}>
        <AppButton variant="ghost" size="md" disabled={activeStep === 0 || submitting} onPress={() => onStepChange(activeStep - 1)} testID={childTestID(id, 'back')}>
          Back
        </AppButton>
        <View style={styles.flex} />
        {onSaveDraft ? (
          <AppButton variant="ghost" size="md" loading={saving} onPress={onSaveDraft} testID={childTestID(id, 'save-draft')}>
            Save draft
          </AppButton>
        ) : null}
        {isLast ? (
          <AppButton variant="primary" size="md" loading={submitting} onPress={onSubmit} testID={childTestID(id, 'submit')}>
            Submit
          </AppButton>
        ) : (
          <AppButton variant="primary" size="md" onPress={() => onStepChange(activeStep + 1)} testID={childTestID(id, 'continue')}>
            Continue
          </AppButton>
        )}
      </View>

      {status === 'success' ? (
        <Text variant="labelMedium" style={{ color: enterprise.colors.success, marginTop: theme.spacing.sm }} accessibilityLiveRegion="polite">
          Your draft was saved.
        </Text>
      ) : status === 'error' ? (
        <Text variant="labelMedium" style={{ color: theme.colors.error, marginTop: theme.spacing.sm }} accessibilityLiveRegion="assertive">
          We couldn't save your draft.
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  stepChip: { paddingHorizontal: 10, paddingVertical: 6 },
  errorBox: { padding: 10, marginTop: 8, gap: 2 },
  footerRow: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
});
