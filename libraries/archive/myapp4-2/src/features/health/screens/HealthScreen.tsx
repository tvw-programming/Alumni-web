import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { List, Text } from 'react-native-paper';

import { AppCard } from '@ui/molecules/AppCard';
import { StateView } from '@ui/molecules/StateView';
import { useAppTheme } from '@/theme';

import {
  AppointmentCardUsage,
  AppointmentSlotGridUsage,
  BMICalculatorCardUsage,
  ChatBubbleUsage,
  ConsentDialogUsage,
  DoctorCardUsage,
  EmergencyContactCardUsage,
  HealthDocumentsUsage,
  HealthQuestionnaireFormUsage,
  MedicationReminderItemUsage,
  SymptomSelectorUsage,
  VideoCallControlsBarUsage,
  VitalsCardUsage,
} from '@ui/healthcare';

interface Entry {
  key: string;
  title: string;
  description: string;
  Component: React.ComponentType;
}

/** Live gallery. Each row renders that component's own `*.usage.tsx`. */
const ENTRIES: Entry[] = [
  { key: 'doctor', title: 'DoctorCard', description: 'Ratings framed as patient feedback, unconfirmed insurance, long names', Component: DoctorCardUsage },
  { key: 'slots', title: 'AppointmentSlotGrid', description: 'Optimistic selection, non-optimistic booking, slot conflicts', Component: AppointmentSlotGridUsage },
  { key: 'appointment', title: 'AppointmentCard', description: 'Check-in required, ready to join, delays, cancellations', Component: AppointmentCardUsage },
  { key: 'symptoms', title: 'SymptomSelector', description: 'Immediate escalation, escape answers, free-text fallback', Component: SymptomSelectorUsage },
  { key: 'vitals', title: 'VitalsCard', description: 'Provenance, calm abnormal states, no thresholds in the UI', Component: VitalsCardUsage },
  { key: 'medication', title: 'MedicationReminderItem', description: 'Due / taken / missed / skipped, refills, no shaming copy', Component: MedicationReminderItemUsage },
  { key: 'documents', title: 'PrescriptionCard + ReportListItem', description: 'Abnormal vs follow-up, restricted access, expired links', Component: HealthDocumentsUsage },
  { key: 'call', title: 'VideoCallControlsBar', description: 'State-driven controls, labelled icons, separated end call', Component: VideoCallControlsBarUsage },
  { key: 'chat', title: 'ChatBubble', description: 'Secure messaging expectations, attachments, failed sends', Component: ChatBubbleUsage },
  { key: 'consent', title: 'ConsentDialog', description: 'Progressive disclosure, unticked optionals, audit records', Component: ConsentDialogUsage },
  { key: 'questionnaire', title: 'HealthQuestionnaireForm', description: 'Branching, honest progress, answers survive validation', Component: HealthQuestionnaireFormUsage },
  { key: 'bmi', title: 'BMICalculatorCard', description: 'Pure engine that refuses to categorise outside adult screening', Component: BMICalculatorCardUsage },
  { key: 'emergency', title: 'EmergencyContactCard', description: 'Locale-aware numbers, asymmetric confirmation, offline', Component: EmergencyContactCardUsage },
];

export const HealthScreen = () => {
  const theme = useAppTheme();
  const [active, setActive] = useState<string | null>(null);

  const entry = useMemo(() => ENTRIES.find((item) => item.key === active), [active]);

  if (entry) {
    const { Component } = entry;
    return (
      <View style={styles.flex}>
        <View style={[styles.header, { padding: theme.spacing.md, backgroundColor: theme.colors.surface }]}>
          <Text variant="titleMedium" style={styles.flex}>
            {entry.title}
          </Text>
          <Text
            variant="labelLarge"
            onPress={() => setActive(null)}
            accessibilityRole="button"
            style={{ color: theme.colors.primary }}
          >
            Back
          </Text>
        </View>
        <Component />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
      <StateView
        preset="success"
        compact
        title="Healthcare component library"
        description="13 components, each with a sample JSON payload and a compiling usage example."
      />

      <AppCard variant="outlined" padded={false}>
        {ENTRIES.map((item, index) => (
          <List.Item
            key={item.key}
            title={item.title}
            description={item.description}
            descriptionNumberOfLines={2}
            onPress={() => setActive(item.key)}
            left={() => (
              <View style={[styles.index, { backgroundColor: theme.colors.surfaceVariant, borderRadius: theme.radii.pill }]}>
                <Text variant="labelSmall">{index + 1}</Text>
              </View>
            )}
            right={() => <List.Icon icon="chevron-right" />}
            testID={`health-entry-${item.key}`}
          />
        ))}
      </AppCard>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center' },
  index: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
});
