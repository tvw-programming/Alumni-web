import React, { forwardRef, useCallback, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Badge, Text } from 'react-native-paper';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { useControllableState, useMotion, type AnimatableProps } from '@/hooks';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';

import type { StyleEscapeHatches } from '../primitives';

export interface TabItem {
  key: string;
  label: string;
  badge?: number | string;
  disabled?: boolean;
}

export interface SegmentedTabsProps extends StyleEscapeHatches, Pick<AnimatableProps, 'animated'> {
  items: TabItem[];
  value?: string;
  defaultValue?: string;
  onChange?: (key: string) => void;
  variant?: 'segmented' | 'underline';
  scrollable?: boolean;
  fullWidth?: boolean;
}

interface Measurement {
  x: number;
  width: number;
}

/**
 * The indicator is a single shared value — we animate *it*, never the tabs.
 * Animating the tabs themselves means re-laying-out text on every frame.
 */
export const SegmentedTabs = forwardRef<View, SegmentedTabsProps>(function SegmentedTabs(
  {
    items,
    value,
    defaultValue,
    onChange,
    variant = 'segmented',
    scrollable = false,
    fullWidth = true,
    animated = true,
    style,
    containerStyle,
    testID,
  },
  ref,
) {
  const theme = useAppTheme();
  const motion = useMotion({ animated });
  const [active, setActive] = useControllableState<string>({
    value,
    defaultValue: defaultValue ?? items[0]?.key ?? '',
    onChange,
  });

  const measurements = useRef<Record<string, Measurement>>({});
  const [ready, setReady] = useState(false);

  const indicatorX = useSharedValue(0);
  const indicatorWidth = useSharedValue(0);
  const spring = theme.motion.spring.gentle;

  const moveIndicator = useCallback(
    (key: string, immediate = false) => {
      const m = measurements.current[key];
      if (!m) return;
      if (immediate || !motion.enabled) {
        indicatorX.value = m.x;
        indicatorWidth.value = m.width;
      } else {
        indicatorX.value = withSpring(m.x, spring);
        indicatorWidth.value = withSpring(m.width, spring);
      }
    },
    [indicatorWidth, indicatorX, motion.enabled, spring],
  );

  const handleLayout = useCallback(
    (key: string) => (event: LayoutChangeEvent) => {
      const { x, width } = event.nativeEvent.layout;
      measurements.current[key] = { x, width };
      if (key === active) {
        moveIndicator(key, !ready);
        setReady(true);
      }
    },
    [active, moveIndicator, ready],
  );

  const handlePress = useCallback(
    (key: string) => {
      setActive(key);
      moveIndicator(key);
    },
    [moveIndicator, setActive],
  );

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: indicatorWidth.value,
  }));

  const isUnderline = variant === 'underline';

  const track = (
    <View
      style={[
        styles.track,
        !isUnderline && {
          backgroundColor: theme.colors.surfaceVariant,
          borderRadius: theme.radii.pill,
          padding: theme.spacing.xxs,
        },
        isUnderline && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.outlineVariant },
        style,
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.indicator,
          indicatorStyle,
          isUnderline
            ? { height: 3, bottom: 0, backgroundColor: theme.colors.primary, borderRadius: theme.radii.sm }
            : {
                top: theme.spacing.xxs,
                bottom: theme.spacing.xxs,
                backgroundColor: theme.colors.surface,
                borderRadius: theme.radii.pill,
              },
        ]}
      />

      {items.map((item) => {
        const selected = item.key === active;
        return (
          <Pressable
            key={item.key}
            onLayout={handleLayout(item.key)}
            onPress={() => handlePress(item.key)}
            disabled={item.disabled}
            style={[
              styles.tab,
              { paddingVertical: theme.spacing.sm, paddingHorizontal: theme.spacing.md },
              fullWidth && !scrollable && styles.flex,
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected, disabled: !!item.disabled }}
            accessibilityLabel={item.label}
            testID={childTestID(testID, `tab-${item.key}`)}
          >
            <Text
              variant="labelLarge"
              numberOfLines={1}
              style={{
                color: selected ? theme.colors.primary : theme.colors.onSurfaceVariant,
                opacity: item.disabled ? theme.opacity.disabled : 1,
              }}
            >
              {item.label}
            </Text>
            {item.badge != null && (
              <Badge size={18} style={{ marginLeft: theme.spacing.xs }}>
                {item.badge}
              </Badge>
            )}
          </Pressable>
        );
      })}
    </View>
  );

  if (!scrollable) {
    return (
      <View ref={ref} style={containerStyle} accessibilityRole="tablist" testID={testID}>
        {track}
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={containerStyle}
      accessibilityRole="tablist"
      testID={testID}
    >
      {track}
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  track: { flexDirection: 'row', alignItems: 'center', position: 'relative' },
  tab: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  indicator: { position: 'absolute', left: 0 },
});
