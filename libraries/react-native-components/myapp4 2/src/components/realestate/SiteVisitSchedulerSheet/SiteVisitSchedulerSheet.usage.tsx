/**
 * USAGE — SiteVisitSchedulerSheet
 *
 * A held slot stays visible and disabled instead of disappearing, so the
 * viewer understands why their expected time isn't selectable rather than
 * wondering if it was ever offered.
 */
import React, { useState } from 'react';
import { View } from 'react-native';

import { AppButton } from '@ui/atoms/AppButton';
import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { CalendarDate, PropertySummary, TimeSlot, VisitRequest, VisitRequestStatus } from '../types/domain';
import { SiteVisitSchedulerSheet } from './SiteVisitSchedulerSheet';
import sample from './SiteVisitSchedulerSheet.sample.json';

const data = loadSample<{ property: PropertySummary; dates: CalendarDate[]; slotsByDate: Record<string, TimeSlot[]> }>(sample);

export const SiteVisitSchedulerSheetUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState<VisitRequestStatus>('idle');

  const handleConfirm = (request: VisitRequest) => {
    setStatus('submitting');
    setTimeout(() => {
      setStatus('pending');
      toast.success('Visit request submitted');
    }, 700);
  };

  return (
    <View style={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
      <AppButton
        variant="primary"
        onPress={() => {
          setStatus('idle');
          setVisible(true);
        }}
      >
        Schedule a tour
      </AppButton>

      <SiteVisitSchedulerSheet
        visible={visible}
        property={data.property}
        dates={data.dates}
        slotsByDate={data.slotsByDate}
        status={status}
        onConfirm={handleConfirm}
        onCancel={() => setVisible(false)}
      />
    </View>
  );
};
