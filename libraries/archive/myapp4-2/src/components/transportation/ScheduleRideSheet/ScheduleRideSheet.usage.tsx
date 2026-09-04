/**
 * USAGE — ScheduleRideSheet
 *
 * The advance-booking disclaimer ("driver assignment is not guaranteed
 * until…") is always visible, not hidden behind a details toggle.
 */
import React, { useState } from 'react';
import { View } from 'react-native';

import { AppButton } from '@ui/atoms/AppButton';
import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { LocationPoint, ScheduledRide } from '../types/domain';
import { ScheduleRideSheet } from './ScheduleRideSheet';
import rawSample from './ScheduleRideSheet.sample.json';

const sample = loadSample<{ pickup: LocationPoint; dropoff: LocationPoint; ride: ScheduledRide; dateOptions: string[] }>(rawSample);

export const ScheduleRideSheetUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const [visible, setVisible] = useState(false);
  const [ride, setRide] = useState<ScheduledRide>(sample.ride);
  const [submitting, setSubmitting] = useState(false);

  return (
    <View style={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
      <AppButton variant="primary" onPress={() => setVisible(true)}>
        Schedule a ride
      </AppButton>

      <ScheduleRideSheet
        visible={visible}
        onDismiss={() => setVisible(false)}
        pickup={sample.pickup}
        dropoff={sample.dropoff}
        ride={ride}
        dateOptions={sample.dateOptions}
        minNoticeLabel="1 hour 15 minutes"
        maxAdvanceLabel="90 days"
        submitting={submitting}
        onChange={setRide}
        onSchedule={() => {
          setSubmitting(true);
          setTimeout(() => {
            setSubmitting(false);
            setVisible(false);
            toast.success('Ride scheduled');
          }, 800);
        }}
      />
    </View>
  );
};
