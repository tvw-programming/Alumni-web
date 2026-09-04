import React, { forwardRef, useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Chip } from 'react-native-paper';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring } from 'react-native-reanimated';

import { useControllableState, useMotion, type AnimatableProps } from '@/hooks';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';

import type { StyleEscapeHatches } from '../primitives';

export interface FilterItem {
  key: string;
  label: string;
  icon?: string;
  count?: number;
  disabled?: boolean;
}

export interface FilterChipGroupProps
  extends StyleEscapeHatches,
    Pick<AnimatableProps, 'animated' | 'animationDuration'> {
  items: FilterItem[];
  /** Controlled selection. */
  selected?: string[];
  defaultSelected?: string[];
  onChange?: (selected: string[]) => void;
  mode?: 'single' | 'multi';
  scrollable?: boolean;
  /** Collapse the tail into a "+N more" chip. */
  maxVisible?: number;
  showClearAll?: boolean;
}

interface AnimatedChipProps {
  item: FilterItem;
  active: boolean;
  animated: boolean;
  onToggle: (key: string) => void;
  testID?: string;
}

const AnimatedChip = React.memo(function AnimatedChip({ item, active, animated, onToggle, testID }: AnimatedChipProps) {
  const theme = useAppTheme();
  const motion = useMotion({ animated });
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePress = useCallback(() => {
    if (motion.enabled) {
      scale.value = withSequence(withSpring(1.08, theme.motion.spring.bouncy), withSpring(1, theme.motion.spring.snappy));
    }
    onToggle(item.key);
  }, [item.key, motion.enabled, onToggle, scale, theme.motion.spring]);

  return (
    <Animated.View style={style} layout={motion.layout}>
      <Chip
        selected={active}
        showSelectedCheck={active}
        icon={item.icon}
        disabled={item.disabled}
        onPress={handlePress}
        accessibilityLabel={item.count != null ? `${item.label}, ${item.count} items` : item.label}
        accessibilityState={{ selected: active, disabled: !!item.disabled }}
        testID={childTestID(testID, `chip-${item.key}`)}
      >
        {item.count != null ? `${item.label} (${item.count})` : item.label}
      </Chip>
    </Animated.View>
  );
});

export const FilterChipGroup = forwardRef<View, FilterChipGroupProps>(function FilterChipGroup(
  {
    items,
    selected,
    defaultSelected = [],
    onChange,
    mode = 'multi',
    scrollable = true,
    maxVisible,
    showClearAll = false,
    animated = true,
    animationDuration,
    style,
    containerStyle,
    testID,
  },
  ref,
) {
  const theme = useAppTheme();
  const motion = useMotion({ animated, animationDuration });
  const [expanded, setExpanded] = useState(false);
  const [value, setValue] = useControllableState<string[]>({
    value: selected,
    defaultValue: defaultSelected,
    onChange,
  });

  const toggle = useCallback(
    (key: string) => {
      setValue((prev) => {
        if (mode === 'single') return prev[0] === key ? [] : [key];
        return prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      });
    },
    [mode, setValue],
  );

  const visible = useMemo(
    () => (maxVisible && !expanded ? items.slice(0, maxVisible) : items),
    [expanded, items, maxVisible],
  );
  const hiddenCount = items.length - visible.length;

  const content = (
    <View style={[styles.row, { gap: theme.spacing.sm }, style]}>
      {visible.map((item) => (
        <AnimatedChip
          key={item.key}
          item={item}
          active={value.includes(item.key)}
          animated={animated}
          onToggle={toggle}
          testID={testID}
        />
      ))}

      {hiddenCount > 0 && (
        <Animated.View layout={motion.layout}>
          <Chip
            icon="dots-horizontal"
            onPress={() => setExpanded(true)}
            accessibilityLabel={`Show ${hiddenCount} more filters`}
            testID={childTestID(testID, 'more')}
          >
            +{hiddenCount} more
          </Chip>
        </Animated.View>
      )}

      {showClearAll && value.length > 0 && (
        <Animated.View entering={motion.entering('scale')} layout={motion.layout}>
          <Chip
            icon="close"
            onPress={() => setValue([])}
            accessibilityLabel="Clear all filters"
            testID={childTestID(testID, 'clear-all')}
          >
            Clear
          </Chip>
        </Animated.View>
      )}
    </View>
  );

  if (!scrollable) {
    return (
      <View ref={ref} style={[styles.wrap, containerStyle]} accessibilityRole="tablist" testID={testID}>
        {content}
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[{ paddingHorizontal: theme.spacing.md }, containerStyle]}
      accessibilityRole="tablist"
      testID={testID}
    >
      {content}
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
});
