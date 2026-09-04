/**
 * USAGE — EmergencyContactCard
 *
 * Calling a personal contact asks for confirmation; calling emergency services
 * does not. That asymmetry is deliberate — friction protects against a mis-tap
 * in one case and costs time in the other.
 */
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SegmentedButtons, Switch, Text } from 'react-native-paper';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { EmergencyContact, EmergencyServices } from '../types/domain';
import { EmergencyContactCard } from './EmergencyContactCard';
import sample from './EmergencyContactCard.sample.json';

const data = loadSample<{
  contacts: EmergencyContact[];
  emergencyServices: EmergencyServices;
  alternateLocale: EmergencyServices;
  crisisSupport: { label: string; description: string };
}>(sample);

export const EmergencyContactCardUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();

  const [region, setRegion] = useState<'in' | 'us'>('in');
  const [offline, setOffline] = useState(false);
  const [empty, setEmpty] = useState(false);

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
      <SegmentedButtons
        value={region}
        onValueChange={(next) => setRegion(next as 'in' | 'us')}
        density="small"
        buttons={[
          { value: 'in', label: 'India (112)' },
          { value: 'us', label: 'US (911)' },
        ]}
      />

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
        <Text variant="labelMedium" style={{ flex: 1 }}>
          Simulate offline
        </Text>
        <Switch value={offline} onValueChange={setOffline} accessibilityLabel="Simulate offline" />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
        <Text variant="labelMedium" style={{ flex: 1 }}>
          Simulate no saved contacts
        </Text>
        <Switch value={empty} onValueChange={setEmpty} accessibilityLabel="Simulate empty state" />
      </View>

      <EmergencyContactCard
        contacts={empty ? [] : data.contacts}
        emergencyServices={region === 'in' ? data.emergencyServices : data.alternateLocale}
        offline={offline}
        maskNumbers
        // In production these route through a controlled calling service so the
        // numbers never reach analytics or crash logs.
        onCallEmergencyServices={() => toast.error('Dialling emergency services (demo)')}
        onCallContact={(contact) => toast.show(`Calling ${contact.name} (demo)`)}
        onEdit={(contact) => toast.show(`Editing ${contact.name}`)}
        onAdd={() => toast.show('Opening the add-contact form')}
        onVerify={(contact) => toast.success(`${contact.name} confirmed`)}
        crisisSupport={{ ...data.crisisSupport, onPress: () => toast.show('Connecting you to support') }}
        testID="emergency"
      />

      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
        Numbers are masked on screen and never written to analytics or crash logs.
      </Text>
    </ScrollView>
  );
};
