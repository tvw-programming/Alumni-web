import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Chip, Divider, Icon, Searchbar, Text } from 'react-native-paper';
import Animated from 'react-native-reanimated';

import { AppButton } from '@ui/atoms/AppButton';
import { AppTextInput } from '@ui/atoms/AppTextInput';
import { AppSheet } from '@ui/organisms/AppSheet';
import { StateView } from '@ui/molecules/StateView';
import { useControllableState, useDebouncedValue, useMotion, type AnimatableProps } from '@/hooks';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { NotAdviceNotice, UrgentEscalation } from '../primitives/ClinicalSafety';
import { useHealthTheme } from '../theme/healthcareTokens';
import type { Symptom, SymptomSelection } from '../types/domain';

export interface SymptomSelectorProps extends StyleEscapeHatches, Pick<AnimatableProps, 'animated'> {
  symptoms: Symptom[];
  /** Frequently-picked symptoms shown before the user searches. */
  suggested?: string[];
  recent?: string[];
  value?: SymptomSelection[];
  defaultValue?: SymptomSelection[];
  onChange?: (selections: SymptomSelection[]) => void;
  /**
   * Fires when a selection carries `clinicalPriority: 'urgent'`. The caller is
   * expected to pause the questionnaire, not merely log this.
   */
  onUrgentTrigger?: (symptom: Symptom) => void;
  /** Free-text path when the taxonomy does not cover it. */
  onMissingSymptom?: (text: string) => void;
  emergencyNumber?: string;
  onCallEmergency?: () => void;
  /** Changes the copy for a caregiver answering on someone else's behalf. */
  subjectLabel?: string;
  maxSelections?: number;
}

/**
 * Symptom intake.
 *
 * The safety-critical behaviours here are structural, not cosmetic:
 * escalation appears the moment an urgent symptom is picked — at the top, not
 * after the questionnaire — and the "I can't find my symptom" path is always
 * visible so nobody is forced into a wrong answer by an incomplete taxonomy.
 * Priority comes from clinical content; nothing is inferred from the label.
 */
export const SymptomSelector = ({
  symptoms,
  suggested = [],
  recent = [],
  value,
  defaultValue = [],
  onChange,
  onUrgentTrigger,
  onMissingSymptom,
  emergencyNumber = '112',
  onCallEmergency,
  subjectLabel,
  maxSelections,
  animated = true,
  style,
  containerStyle,
  testID,
}: SymptomSelectorProps) => {
  const theme = useAppTheme();
  const health = useHealthTheme();
  const motion = useMotion({ animated });

  const [query, setQuery] = useState('');
  const debounced = useDebouncedValue(query, 200);
  const [detailFor, setDetailFor] = useState<Symptom | null>(null);
  const [missingText, setMissingText] = useState('');
  const [missingOpen, setMissingOpen] = useState(false);

  const [selections, setSelections] = useControllableState<SymptomSelection[]>({
    value,
    defaultValue,
    onChange,
  });

  const byId = useMemo(() => new Map(symptoms.map((symptom) => [symptom.id, symptom])), [symptoms]);

  /** Search matches synonyms too — patients rarely use the clinical term. */
  const results = useMemo(() => {
    if (!debounced.trim()) return [];
    const q = debounced.trim().toLowerCase();
    return symptoms.filter(
      (symptom) =>
        symptom.label.toLowerCase().includes(q) ||
        symptom.synonyms?.some((synonym) => synonym.toLowerCase().includes(q)),
    );
  }, [debounced, symptoms]);

  const selectedIds = useMemo(() => selections.map((item) => item.symptomId), [selections]);

  const urgentSelected = useMemo(
    () => selections.map((item) => byId.get(item.symptomId)).filter((s): s is Symptom => s?.clinicalPriority === 'urgent'),
    [byId, selections],
  );

  const toggle = useCallback(
    (symptom: Symptom) => {
      const already = selectedIds.includes(symptom.id);

      if (!already && maxSelections && selections.length >= maxSelections) return;

      setSelections((prev) =>
        already ? prev.filter((item) => item.symptomId !== symptom.id) : [...prev, { symptomId: symptom.id }],
      );

      // Escalate immediately on selection — never at the end of a flow.
      if (!already && symptom.clinicalPriority === 'urgent') onUrgentTrigger?.(symptom);
      if (!already && symptom.severityOptions?.length) setDetailFor(symptom);
    },
    [maxSelections, onUrgentTrigger, selectedIds, selections.length, setSelections],
  );

  const updateDetail = useCallback(
    (symptomId: string, patch: Partial<SymptomSelection>) => {
      setSelections((prev) => prev.map((item) => (item.symptomId === symptomId ? { ...item, ...patch } : item)));
    },
    [setSelections],
  );

  const renderChip = (symptom: Symptom) => {
    const selected = selectedIds.includes(symptom.id);
    return (
      <Chip
        key={symptom.id}
        selected={selected}
        showSelectedCheck={selected}
        onPress={() => toggle(symptom)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: selected }}
        accessibilityLabel={`${symptom.label}${symptom.bodyRegion ? `, ${symptom.bodyRegion}` : ''}`}
        testID={childTestID(testID, `symptom-${symptom.id}`)}
      >
        {symptom.label}
      </Chip>
    );
  };

  return (
    <View style={[{ gap: theme.spacing.md }, containerStyle, style]} testID={testID}>
      {/* Escalation sits at the top the instant it applies. */}
      {urgentSelected.length > 0 ? (
        <UrgentEscalation
          emergencyNumber={emergencyNumber}
          title="Some of what you selected may need urgent care"
          message={`You selected ${urgentSelected
            .map((symptom) => symptom.label.toLowerCase())
            .join(', ')}. If this is severe or getting worse, call ${emergencyNumber} or your local emergency number now. Do not wait for this questionnaire.`}
          onCallEmergency={onCallEmergency}
          variant="blocking"
          testID={childTestID(testID, 'escalation')}
        />
      ) : null}

      <Text variant="titleSmall">
        {subjectLabel ? `What symptoms does ${subjectLabel} have?` : 'What symptoms do you have?'}
      </Text>
      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
        Select all that apply.
      </Text>

      <Searchbar
        value={query}
        onChangeText={setQuery}
        placeholder="Search symptoms"
        style={{ borderRadius: theme.radii.md }}
        inputStyle={{ minHeight: 0 }}
        accessibilityLabel="Search symptoms"
        testID={childTestID(testID, 'search')}
      />

      {selections.length > 0 ? (
        <View style={{ gap: theme.spacing.sm }}>
          <Text variant="labelMedium" accessibilityLiveRegion="polite">
            {selections.length} selected
          </Text>
          <Animated.View style={[styles.chips, { gap: theme.spacing.xs }]} layout={motion.layout}>
            {selections.map((selection) => {
              const symptom = byId.get(selection.symptomId);
              if (!symptom) return null;
              return (
                <Chip
                  key={selection.symptomId}
                  selected
                  onPress={() => setDetailFor(symptom)}
                  onClose={() => toggle(symptom)}
                  closeIconAccessibilityLabel={`Remove ${symptom.label}`}
                  accessibilityLabel={`${symptom.label}${selection.severity ? `, ${selection.severity}` : ''}. Tap to add detail.`}
                  testID={childTestID(testID, `selected-${symptom.id}`)}
                >
                  {symptom.label}
                  {selection.severity ? ` · ${selection.severity}` : ''}
                </Chip>
              );
            })}
          </Animated.View>
          <Divider />
        </View>
      ) : null}

      {query.trim() ? (
        results.length > 0 ? (
          <View style={[styles.chips, { gap: theme.spacing.xs }]}>{results.map(renderChip)}</View>
        ) : (
          <StateView
            preset="noResults"
            compact
            title="No matching symptom"
            description={`We could not find “${query}”. You can describe it in your own words instead.`}
            primaryAction={{ label: "Describe it yourself", onPress: () => setMissingOpen(true) }}
            testID={childTestID(testID, 'no-results')}
          />
        )
      ) : (
        <>
          {recent.length > 0 ? (
            <View style={{ gap: theme.spacing.sm }}>
              <Text variant="labelMedium">Recent</Text>
              <View style={[styles.chips, { gap: theme.spacing.xs }]}>
                {recent.map((id) => byId.get(id)).filter((s): s is Symptom => !!s).map(renderChip)}
              </View>
            </View>
          ) : null}

          <View style={{ gap: theme.spacing.sm }}>
            <Text variant="labelMedium">Common symptoms</Text>
            <View style={[styles.chips, { gap: theme.spacing.xs }]}>
              {(suggested.length > 0
                ? suggested.map((id) => byId.get(id)).filter((s): s is Symptom => !!s)
                : symptoms.slice(0, 12)
              ).map(renderChip)}
            </View>
          </View>
        </>
      )}

      {/* Always available, never hidden behind an empty search. */}
      <AppButton
        variant="ghost"
        icon="comment-question-outline"
        onPress={() => setMissingOpen(true)}
        testID={childTestID(testID, 'missing')}
      >
        I can’t find my symptom
      </AppButton>

      <NotAdviceNotice
        text={`This tool does not diagnose medical conditions. If you have severe symptoms or believe this is an emergency, call ${emergencyNumber} or your local emergency number.`}
        testID={childTestID(testID, 'disclaimer')}
      />

      {/* Severity / onset detail */}
      <AppSheet
        visible={!!detailFor}
        onDismiss={() => setDetailFor(null)}
        variant="bottom"
        title={detailFor?.label}
        animated={animated}
        scrollable
        testID={childTestID(testID, 'detail-sheet')}
      >
        {detailFor ? (
          <View style={{ gap: theme.spacing.md }}>
            {detailFor.severityOptions?.length ? (
              <View style={{ gap: theme.spacing.sm }}>
                <Text variant="labelLarge">How bad is it?</Text>
                <View style={[styles.chips, { gap: theme.spacing.xs }]}>
                  {detailFor.severityOptions.map((option) => {
                    const current = selections.find((item) => item.symptomId === detailFor.id)?.severity;
                    return (
                      <Chip
                        key={option.id}
                        selected={current === option.label}
                        showSelectedCheck={current === option.label}
                        onPress={() => updateDetail(detailFor.id, { severity: option.label })}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: current === option.label }}
                      >
                        {option.label}
                      </Chip>
                    );
                  })}
                  {/* "Not sure" always exists — never force a false answer. */}
                  <Chip onPress={() => updateDetail(detailFor.id, { severity: 'Not sure' })}>I’m not sure</Chip>
                </View>
              </View>
            ) : null}

            <View style={{ gap: theme.spacing.sm }}>
              <Text variant="labelLarge">When did it start?</Text>
              <View style={[styles.chips, { gap: theme.spacing.xs }]}>
                {['Today', 'A few days ago', 'About a week ago', 'Longer', 'I’m not sure'].map((onset) => {
                  const current = selections.find((item) => item.symptomId === detailFor.id)?.onset;
                  return (
                    <Chip
                      key={onset}
                      selected={current === onset}
                      showSelectedCheck={current === onset}
                      onPress={() => updateDetail(detailFor.id, { onset })}
                    >
                      {onset}
                    </Chip>
                  );
                })}
              </View>
            </View>

            <View style={{ gap: theme.spacing.sm }}>
              <Text variant="labelLarge">Is it constant?</Text>
              <View style={[styles.chips, { gap: theme.spacing.xs }]}>
                {(['constant', 'intermittent', 'unknown'] as const).map((pattern) => {
                  const current = selections.find((item) => item.symptomId === detailFor.id)?.pattern;
                  return (
                    <Chip
                      key={pattern}
                      selected={current === pattern}
                      showSelectedCheck={current === pattern}
                      onPress={() => updateDetail(detailFor.id, { pattern })}
                    >
                      {pattern === 'constant' ? 'Constant' : pattern === 'intermittent' ? 'Comes and goes' : 'Not sure'}
                    </Chip>
                  );
                })}
              </View>
            </View>

            <AppButton variant="primary" fullWidth onPress={() => setDetailFor(null)}>
              Done
            </AppButton>
          </View>
        ) : null}
      </AppSheet>

      {/* Free-text fallback */}
      <AppSheet
        visible={missingOpen}
        onDismiss={() => setMissingOpen(false)}
        variant="bottom"
        title="Describe your symptom"
        animated={animated}
        testID={childTestID(testID, 'missing-sheet')}
      >
        <View style={{ gap: theme.spacing.md }}>
          <AppTextInput
            label="In your own words"
            value={missingText}
            onChangeText={setMissingText}
            multiline
            numberOfLines={4}
            showCounter
            maxLength={300}
            helperText="Your care team will read this."
            testID={childTestID(testID, 'missing-input')}
          />
          <View style={[styles.row, { gap: 4 }]}>
            <Icon source="shield-lock-outline" size={14} color={health.colors.provenancePatient} />
            <Text variant="labelSmall" style={{ color: health.colors.provenancePatient, flex: 1 }}>
              This is stored with your medical record and shared only with your care team.
            </Text>
          </View>
          <AppButton
            variant="primary"
            fullWidth
            disabled={missingText.trim().length < 3}
            onPress={() => {
              onMissingSymptom?.(missingText.trim());
              setMissingText('');
              setMissingOpen(false);
            }}
          >
            Add
          </AppButton>
        </View>
      </AppSheet>
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
});
