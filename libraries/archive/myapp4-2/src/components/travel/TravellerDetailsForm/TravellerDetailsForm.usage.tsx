/**
 * USAGE — TravellerDetailsForm
 *
 * Traveler 2 ships with server-style field errors pre-populated to show the
 * error-summary banner and per-field messages together.
 */
import React, { useState } from 'react';
import { ScrollView } from 'react-native';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { AssistanceRequest, ContactDetails, Traveller, TravellerFieldError } from '../types/domain';
import { TravellerDetailsForm } from './TravellerDetailsForm';
import rawSample from './TravellerDetailsForm.sample.json';

const sample = loadSample<{
  travellers: Traveller[];
  assistanceOptions: AssistanceRequest[];
  bookerContact: ContactDetails;
  errors: Record<string, TravellerFieldError[]>;
}>(rawSample);

export const TravellerDetailsFormUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const [travellers, setTravellers] = useState<Traveller[]>(sample.travellers);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = () => {
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      toast.success('Traveler details saved');
    }, 700);
  };

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md }}>
      <TravellerDetailsForm
        travellers={travellers}
        onChange={setTravellers}
        requirePassport
        assistanceOptions={sample.assistanceOptions}
        bookerContact={sample.bookerContact}
        errors={sample.errors}
        submitting={submitting}
        onSubmit={handleSubmit}
      />
    </ScrollView>
  );
};
