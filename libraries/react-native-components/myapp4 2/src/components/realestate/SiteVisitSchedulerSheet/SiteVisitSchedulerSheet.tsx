import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Icon, SegmentedButtons, Text, TextInput, TouchableRipple } from 'react-native-paper';

import { AppButton } from '@ui/atoms/AppButton';
import { AppSheet } from '@ui/organisms/AppSheet';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { usePropertyTheme } from '../theme/realestateTokens';
import type { CalendarDate, PropertySummary, TimeSlot, VisitMode, VisitRequest, VisitRequestStatus } from '../types/domain';

export interface SiteVisitSchedulerSheetProps extends StyleEscapeHatches {
  visible: boolean;
  property: PropertySummary;
  dates: CalendarDate[];
  slotsByDate: Record<string, TimeSlot[]>;
  visitModes?: VisitMode[];
  status?: VisitRequestStatus;
  onConfirm: (request: VisitRequest) => void;
  onCancel: () => void;
}

const MODE_LABEL: Record<VisitMode, string> = { inPerson: 'In-person visit', virtual: 'Virtual tour' };

/**
 * A progressive flow — mode, then date, then time, then contact details —
 * with the property and address always visible so a confirmation is never
 * submitted against the wrong listing. "Pending confirmation" is a real,
 * separate state from "Confirmed," never conflated.
 */
export const SiteVisitSchedulerSheet = ({ visible, property, dates, slotsByDate, visitModes = ['inPerson', 'virtual'], status = 'idle', onConfirm, onCancel, style, containerStyle, testID }: SiteVisitSchedulerSheetProps) => {
  const theme = useAppTheme();
  const realestate = usePropertyTheme();
  const id = testID ?? 'site-visit-scheduler-sheet';

  const [mode, setMode] = useState<VisitMode>(visitModes[0] ?? 'inPerson');
  const [selectedDate, setSelectedDate] = useState<string | undefined>(dates.find((d) => d.availableCount > 0)?.date);
  const [selectedSlotId, setSelectedSlotId] = useState<string | undefined>(undefined);
  const [visitorCount, setVisitorCount] = useState(1);
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [instructions, setInstructions] = useState('');

  const slots = selectedDate ? (slotsByDate[selectedDate] ?? []) : [];
  const submitting = status === 'submitting';
  const pending = status === 'pending';
  const confirmed = status === 'confirmed';

  const canSubmit = !!selectedDate && !!selectedSlotId && contactName.trim().length > 0 && contactPhone.trim().length > 0;

  const handleConfirm = () => {
    if (!canSubmit || !selectedDate || !selectedSlotId) return;
    onConfirm({ propertyId: property.id, date: selectedDate, slotId: selectedSlotId, mode, visitorCount, contactName: contactName.trim(), contactPhone: contactPhone.trim(), instructions: instructions.trim() || undefined });
  };

  if (pending || confirmed) {
    return (
      <AppSheet visible={visible} onDismiss={onCancel} variant="bottom" scrollable={false} style={style} containerStyle={containerStyle} testID={id}>
        <View style={{ padding: theme.spacing.lg, alignItems: 'center', gap: theme.spacing.sm }}>
          <Icon source={confirmed ? 'check-circle' : 'clock-outline'} size={40} color={confirmed ? realestate.colors.success : realestate.colors.pending} />
          <Text variant="titleMedium" accessibilityLiveRegion="polite">
            {confirmed ? 'Visit confirmed' : 'Your request is pending confirmation'}
          </Text>
          <Text variant="bodySmall" style={{ color: realestate.colors.onSurfaceVariant, textAlign: 'center' }}>
            {confirmed ? `See you at ${property.title}.` : 'The agent will contact you to confirm.'}
          </Text>
          <AppButton variant="primary" size="lg" fullWidth onPress={onCancel} testID={childTestID(id, 'done')}>
            Done
          </AppButton>
        </View>
      </AppSheet>
    );
  }

  return (
    <AppSheet
      visible={visible}
      onDismiss={onCancel}
      variant="bottom"
      title="Schedule a tour"
      scrollable={false}
      style={style}
      containerStyle={containerStyle}
      testID={id}
      footer={
        <AppButton variant="primary" size="lg" fullWidth disabled={!canSubmit} loading={submitting} onPress={handleConfirm} testID={childTestID(id, 'confirm')}>
          Submit request
        </AppButton>
      }
    >
      <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
        <View style={[styles.propertyRow, { backgroundColor: realestate.colors.surfaceVariant, borderRadius: theme.radii.sm }]}>
          <Icon source="home-city-outline" size={16} color={realestate.colors.onSurfaceVariant} />
          <View style={{ marginLeft: 8, flex: 1 }}>
            <Text variant="bodyMedium" numberOfLines={1}>
              {property.title}
            </Text>
            <Text variant="labelSmall" style={{ color: realestate.colors.onSurfaceVariant }} numberOfLines={1}>
              {property.locality}, {property.city}
            </Text>
          </View>
        </View>

        <SegmentedButtons value={mode} onValueChange={(v) => setMode(v as VisitMode)} buttons={visitModes.map((m) => ({ value: m, label: MODE_LABEL[m] }))} />

        <View>
          <Text variant="labelMedium" style={{ marginBottom: 6 }}>
            Choose a date
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {dates.map((d) => {
              const selected = d.date === selectedDate;
              const disabled = d.availableCount === 0;
              const date = new Date(d.date);
              return (
                <TouchableRipple
                  key={d.date}
                  onPress={disabled ? undefined : () => { setSelectedDate(d.date); setSelectedSlotId(undefined); }}
                  disabled={disabled}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected, disabled }}
                  style={[styles.dateChip, { borderRadius: theme.radii.md, borderColor: selected ? theme.colors.primary : theme.colors.outlineVariant, borderWidth: selected ? 2 : StyleSheet.hairlineWidth, opacity: disabled ? 0.4 : 1 }]}
                  testID={childTestID(id, `date-${d.date}`)}
                >
                  <View style={{ alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12 }}>
                    <Text variant="labelSmall" style={{ color: realestate.colors.onSurfaceVariant }}>
                      {date.toLocaleDateString(undefined, { weekday: 'short' })}
                    </Text>
                    <Text variant="labelMedium">{date.getDate()}</Text>
                  </View>
                </TouchableRipple>
              );
            })}
          </ScrollView>
        </View>

        {selectedDate ? (
          <View>
            <Text variant="labelMedium" style={{ marginBottom: 6 }}>
              Choose a time
            </Text>
            {slots.length === 0 ? (
              <Text variant="bodySmall" style={{ color: realestate.colors.onSurfaceVariant }}>
                No time slots available for this date.
              </Text>
            ) : (
              <View style={styles.slotGrid}>
                {slots.map((slot) => {
                  const disabled = slot.status !== 'available';
                  const selected = slot.id === selectedSlotId;
                  return (
                    <TouchableRipple
                      key={slot.id}
                      onPress={disabled ? undefined : () => setSelectedSlotId(slot.id)}
                      disabled={disabled}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selected, disabled }}
                      style={[styles.slotChip, { borderRadius: theme.radii.pill, borderColor: selected ? theme.colors.primary : theme.colors.outlineVariant, borderWidth: selected ? 2 : StyleSheet.hairlineWidth, opacity: disabled ? 0.4 : 1 }]}
                      testID={childTestID(id, `slot-${slot.id}`)}
                    >
                      <Text variant="labelMedium" style={{ paddingVertical: 6, paddingHorizontal: 10 }}>
                        {new Date(slot.startsAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                        {disabled ? ' · Held' : ''}
                      </Text>
                    </TouchableRipple>
                  );
                })}
              </View>
            )}
          </View>
        ) : null}

        <TextInput mode="outlined" label="Your name" value={contactName} onChangeText={setContactName} testID={childTestID(id, 'name')} />
        <TextInput mode="outlined" label="Phone number" keyboardType="phone-pad" value={contactPhone} onChangeText={setContactPhone} testID={childTestID(id, 'phone')} />
        <TextInput mode="outlined" label="Number of visitors" keyboardType="number-pad" value={String(visitorCount)} onChangeText={(t) => setVisitorCount(Math.max(1, Number(t) || 1))} testID={childTestID(id, 'visitors')} />
        <TextInput mode="outlined" label="Special instructions (optional)" multiline value={instructions} onChangeText={setInstructions} testID={childTestID(id, 'instructions')} />
      </ScrollView>
    </AppSheet>
  );
};

const styles = StyleSheet.create({
  propertyRow: { flexDirection: 'row', alignItems: 'center', padding: 10 },
  dateChip: { overflow: 'hidden' },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slotChip: { overflow: 'hidden' },
});
