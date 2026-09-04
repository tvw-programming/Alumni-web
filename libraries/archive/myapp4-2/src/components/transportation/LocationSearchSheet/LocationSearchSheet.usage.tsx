/**
 * USAGE — LocationSearchSheet
 *
 * Confirm stays disabled until both pickup and destination are set — the
 * sheet never guesses a destination or silently confirms a partial route.
 */
import React, { useState } from 'react';
import { View } from 'react-native';
import { Text } from 'react-native-paper';

import { AppButton } from '@ui/atoms/AppButton';
import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { LocationPoint } from '../types/domain';
import { LocationSearchSheet } from './LocationSearchSheet';
import rawSample from './LocationSearchSheet.sample.json';

const sample = loadSample<{ pickup: LocationPoint; searchResults: LocationPoint[]; recentPlaces: LocationPoint[]; savedPlaces: LocationPoint[] }>(rawSample);

export const LocationSearchSheetUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const [visible, setVisible] = useState(false);
  const [pickup, setPickup] = useState<LocationPoint | undefined>(sample.pickup);
  const [dropoff, setDropoff] = useState<LocationPoint | undefined>(undefined);

  return (
    <View style={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
      <Text variant="bodyMedium">
        {pickup ? pickup.label : 'No pickup set'} → {dropoff ? dropoff.label : 'No destination set'}
      </Text>
      <AppButton variant="primary" onPress={() => setVisible(true)}>
        Plan a ride
      </AppButton>

      <LocationSearchSheet
        visible={visible}
        onDismiss={() => setVisible(false)}
        pickup={pickup}
        dropoff={dropoff}
        searchResults={sample.searchResults}
        recentPlaces={sample.recentPlaces}
        savedPlaces={sample.savedPlaces}
        onPickupChange={setPickup}
        onDropoffChange={setDropoff}
        onSwap={() => {
          const p = pickup;
          setPickup(dropoff);
          setDropoff(p);
          toast.show('Swapped pickup and destination');
        }}
        onUseCurrentLocation={() => {
          setPickup(sample.pickup);
          toast.show('Using current location');
        }}
        onChooseOnMap={() => toast.show('Opening map pin selector')}
        onConfirm={() => {
          setVisible(false);
          toast.success('Pickup confirmed');
        }}
      />
    </View>
  );
};
