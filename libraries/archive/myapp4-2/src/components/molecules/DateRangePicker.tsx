import React, { forwardRef, useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Chip, Divider, IconButton, Text } from 'react-native-paper';
import Animated from 'react-native-reanimated';

import { useControllableState, useMotion, type AnimatableProps } from '@/hooks';
import { useAppTheme } from '@/theme';
import { childTestID, formatDate } from '@/utils';

import { AppButton } from '../atoms/AppButton';
import { AppSheet } from '../organisms/AppSheet';
import type { StateProps, StyleEscapeHatches } from '../primitives';

export interface DateRange {
  start: Date | null;
  end: Date | null;
}

export interface DatePreset {
  key: string;
  label: string;
  /** Returns the range this preset represents, evaluated on tap. */
  resolve: () => DateRange;
}

export interface DateRangePickerProps extends StateProps, StyleEscapeHatches, Pick<AnimatableProps, 'animated'> {
  value?: DateRange;
  defaultValue?: DateRange;
  onChange?: (range: DateRange) => void;
  mode?: 'single' | 'range';
  minDate?: Date;
  maxDate?: Date;
  presets?: DatePreset[];
  label?: string;
  locale?: string;
}

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const addDays = (date: Date, days: number) => new Date(date.getTime() + days * 86_400_000);
const sameDay = (a: Date | null, b: Date | null) =>
  !!a && !!b && a.toDateString() === b.toDateString();

export const DEFAULT_DATE_PRESETS: DatePreset[] = [
  { key: 'today', label: 'Today', resolve: () => ({ start: startOfDay(new Date()), end: startOfDay(new Date()) }) },
  { key: '7d', label: 'Last 7 days', resolve: () => ({ start: startOfDay(addDays(new Date(), -6)), end: startOfDay(new Date()) }) },
  { key: '30d', label: 'Last 30 days', resolve: () => ({ start: startOfDay(addDays(new Date(), -29)), end: startOfDay(new Date()) }) },
];

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export const DateRangePicker = forwardRef<View, DateRangePickerProps>(function DateRangePicker(
  {
    value,
    defaultValue = { start: null, end: null },
    onChange,
    mode = 'range',
    minDate,
    maxDate,
    presets = DEFAULT_DATE_PRESETS,
    label = 'Dates',
    locale = 'en-IN',
    error = false,
    disabled = false,
    animated = true,
    style,
    containerStyle,
    testID,
  },
  ref,
) {
  const theme = useAppTheme();
  const motion = useMotion({ animated });
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(() => new Date());
  const [range, setRange] = useControllableState<DateRange>({ value, defaultValue, onChange });

  const days = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const total = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const lead = first.getDay();
    return [
      ...Array.from({ length: lead }, () => null),
      ...Array.from({ length: total }, (_, i) => new Date(cursor.getFullYear(), cursor.getMonth(), i + 1)),
    ];
  }, [cursor]);

  const isDisabled = useCallback(
    (day: Date) => (minDate && day < startOfDay(minDate)) || (maxDate && day > startOfDay(maxDate)),
    [maxDate, minDate],
  );

  const handleDayPress = useCallback(
    (day: Date) => {
      if (mode === 'single') {
        setRange({ start: day, end: day });
        return;
      }
      setRange((prev) =>
        !prev.start || (prev.start && prev.end)
          ? { start: day, end: null }
          : day < prev.start
            ? { start: day, end: prev.start }
            : { start: prev.start, end: day },
      );
    },
    [mode, setRange],
  );

  const summary = range.start
    ? mode === 'single' || !range.end
      ? formatDate(range.start, locale)
      : `${formatDate(range.start, locale)} – ${formatDate(range.end, locale)}`
    : 'Any date';

  return (
    <View ref={ref} style={containerStyle} testID={testID}>
      <Pressable
        onPress={() => setOpen(true)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${summary}`}
        accessibilityState={{ disabled }}
        style={[
          styles.trigger,
          {
            borderColor: error ? theme.colors.error : theme.colors.outline,
            borderRadius: theme.radii.md,
            padding: theme.spacing.md,
            opacity: disabled ? theme.opacity.disabled : 1,
          },
          style,
        ]}
        testID={childTestID(testID, 'trigger')}
      >
        <View style={styles.flex}>
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {label}
          </Text>
          <Text variant="bodyLarge">{summary}</Text>
        </View>
        <IconButton icon="calendar" size={theme.sizing.icon.md} onPress={() => setOpen(true)} accessibilityLabel="Open calendar" />
      </Pressable>

      <AppSheet
        visible={open}
        onDismiss={() => setOpen(false)}
        variant="bottom"
        title={label}
        animated={animated}
        testID={childTestID(testID, 'sheet')}
        footer={
          <View style={[styles.footer, { gap: theme.spacing.sm }]}>
            <AppButton variant="ghost" onPress={() => setRange({ start: null, end: null })}>
              Clear
            </AppButton>
            <AppButton variant="primary" onPress={() => setOpen(false)}>
              Apply
            </AppButton>
          </View>
        }
      >
        {presets.length > 0 && (
          <View style={[styles.presets, { gap: theme.spacing.sm, marginBottom: theme.spacing.md }]}>
            {presets.map((preset) => (
              <Chip
                key={preset.key}
                onPress={() => setRange(preset.resolve())}
                testID={childTestID(testID, `preset-${preset.key}`)}
              >
                {preset.label}
              </Chip>
            ))}
          </View>
        )}

        <View style={styles.monthHeader}>
          <IconButton
            icon="chevron-left"
            onPress={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
            accessibilityLabel="Previous month"
          />
          <Text variant="titleMedium">
            {new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(cursor)}
          </Text>
          <IconButton
            icon="chevron-right"
            onPress={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
            accessibilityLabel="Next month"
          />
        </View>
        <Divider />

        <View style={styles.week}>
          {WEEKDAYS.map((day, i) => (
            <Text key={i} variant="labelSmall" style={[styles.cell, { color: theme.colors.onSurfaceVariant }]}>
              {day}
            </Text>
          ))}
        </View>

        <Animated.View style={styles.grid} layout={motion.layout}>
          {days.map((day, i) => {
            if (!day) return <View key={`pad-${i}`} style={styles.cell} />;
            const selected = sameDay(day, range.start) || sameDay(day, range.end);
            const inRange =
              !!range.start && !!range.end && day > range.start && day < range.end;
            const blocked = isDisabled(day);

            return (
              <Pressable
                key={day.toISOString()}
                onPress={() => handleDayPress(day)}
                disabled={blocked}
                style={[
                  styles.cell,
                  styles.day,
                  inRange && { backgroundColor: theme.colors.primaryContainer },
                  selected && { backgroundColor: theme.colors.primary, borderRadius: theme.radii.pill },
                ]}
                accessibilityRole="button"
                accessibilityLabel={formatDate(day, locale)}
                accessibilityState={{ selected, disabled: !!blocked }}
                testID={childTestID(testID, `day-${day.getDate()}`)}
              >
                <Text
                  variant="bodyMedium"
                  style={{
                    color: selected
                      ? theme.colors.onPrimary
                      : blocked
                        ? theme.colors.outlineVariant
                        : theme.colors.onSurface,
                  }}
                >
                  {day.getDate()}
                </Text>
              </Pressable>
            );
          })}
        </Animated.View>
      </AppSheet>
    </View>
  );
});

const styles = StyleSheet.create({
  trigger: { flexDirection: 'row', alignItems: 'center', borderWidth: 1 },
  flex: { flex: 1 },
  footer: { flexDirection: 'row', justifyContent: 'flex-end' },
  presets: { flexDirection: 'row', flexWrap: 'wrap' },
  monthHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  week: { flexDirection: 'row', marginTop: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, textAlign: 'center', alignItems: 'center', justifyContent: 'center', height: 40 },
  day: { alignItems: 'center', justifyContent: 'center' },
});
