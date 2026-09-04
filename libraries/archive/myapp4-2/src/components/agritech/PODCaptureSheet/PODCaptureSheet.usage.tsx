import React, { useState } from 'react';
import { View } from 'react-native';
import { Text } from 'react-native-paper';

import { AppButton } from '@ui/atoms/AppButton';
import { useAppTheme } from '@/theme';

import { PODCaptureSheet } from './PODCaptureSheet';
import sample from './PODCaptureSheet.sample.json';
import { loadSample } from '../types/sample';
import type { EvidenceSubmission, PODRequirement } from '../types/domain';

const REQUIREMENTS = loadSample<{ requirements: PODRequirement[] }>(sample).requirements;

export const PODCaptureSheetUsage = () => {
  const theme = useAppTheme();
  const [visible, setVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadError, setUploadError] = useState<string | undefined>(undefined);
  const [failNext, setFailNext] = useState(true);

  const handleSubmit = (evidence: EvidenceSubmission) => {
    setSubmitting(true);
    setUploadError(undefined);
    setTimeout(() => {
      setSubmitting(false);
      if (failNext) {
        setFailNext(false);
        setUploadError("Couldn't upload proof. Saved for later.");
        return;
      }
      setVisible(false);
    }, 1200);
  };

  return (
    <View style={{ flex: 1, padding: theme.spacing.md }}>
      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: theme.spacing.sm }}>
        The first submit attempt simulates a failed upload that stays visibly recoverable.
      </Text>
      <AppButton variant="primary" size="md" onPress={() => setVisible(true)}>
        Capture proof of delivery
      </AppButton>
      <PODCaptureSheet
        visible={visible}
        shipmentId="ship-1"
        stopId="stop-3"
        requirements={REQUIREMENTS}
        mode="delivery"
        submitting={submitting}
        uploadError={uploadError}
        onSubmit={handleSubmit}
        onSaveOffline={() => setVisible(false)}
        onCancel={() => setVisible(false)}
      />
    </View>
  );
};
