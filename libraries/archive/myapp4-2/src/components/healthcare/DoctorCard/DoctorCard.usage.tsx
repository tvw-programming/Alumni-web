/**
 * USAGE — DoctorCard
 *
 * Eligibility, scheduling and fee resolution all sit in the screen. The card
 * receives explicit state and emits intent — it never checks insurance itself.
 */
import React, { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SegmentedButtons, Text } from 'react-native-paper';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { ConsultationMode, Doctor } from '../types/domain';
import { DoctorCard, type DoctorCardVariant } from './DoctorCard';
import sample from './DoctorCard.sample.json';

const { doctors } = loadSample<{ doctors: Doctor[] }>(sample);

export const DoctorCardUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const [variant, setVariant] = useState<DoctorCardVariant>('search');
  const [favorites, setFavorites] = useState<string[]>(['dr-1']);

  const handleBook = useCallback(
    (doctor: Doctor, mode: ConsultationMode) => toast.success(`Opening ${mode} times for ${doctor.name}`),
    [toast],
  );

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
      <SegmentedButtons
        value={variant}
        onValueChange={(next) => setVariant(next as DoctorCardVariant)}
        buttons={[
          { value: 'search', label: 'Search' },
          { value: 'compact', label: 'Compact' },
          { value: 'unavailable', label: 'No slots' },
        ]}
      />

      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
        Dr. Venkataraman Krishnamurthy has a deliberately long name and credentials; Dr. Nair has only 7 reviews, which is
        labelled rather than averaged into a confident-looking score.
      </Text>

      {doctors.map((doctor, index) => (
        <DoctorCard
          key={doctor.id}
          doctor={doctor}
          variant={variant}
          index={index}
          entering="slideUp"
          favorite={favorites.includes(doctor.id)}
          onFavorite={(item, next) =>
            setFavorites((prev) => (next ? [...prev, item.id] : prev.filter((id) => id !== item.id)))
          }
          onViewProfile={(item) => toast.show(`Opening ${item.name}'s profile`)}
          onBook={handleBook}
        />
      ))}

      <Text variant="labelLarge">Loading skeleton</Text>
      <DoctorCard doctor={doctors[0]!} loading testID="doctor-loading" />

      <Text variant="labelLarge">Booking for a dependant</Text>
      <DoctorCard
        doctor={doctors[0]!}
        patientContextLabel="Aarav (son, 7)"
        onViewProfile={() => toast.show('Profile')}
        onBook={handleBook}
        testID="doctor-dependant"
      />

      <View style={{ height: theme.spacing.xl }} />
    </ScrollView>
  );
};
