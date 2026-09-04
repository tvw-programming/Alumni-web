import React, { forwardRef, memo, useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Divider, Icon, Text, TouchableRipple } from 'react-native-paper';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';

import { useMotion, useStableCallback, type AnimatableProps } from '@/hooks';
import { resolveIntent, useAppTheme, type Intent } from '@/theme';
import { childTestID } from '@/utils';

import type { Size, StyleEscapeHatches } from '../primitives';

/**
 * Predictable heights are what make `getItemLayout` / `estimatedItemSize`
 * possible, which is what makes long lists smooth. Do not make this dynamic.
 */
export const LIST_ITEM_HEIGHTS: Record<Size, number> = { sm: 56, md: 72, lg: 88 };

const ACTION_WIDTH = 76;

export interface SwipeAction {
  key: string;
  label: string;
  icon: string;
  intent?: Intent;
  onPress: () => void;
}

export interface ListItemRowProps extends StyleEscapeHatches, Pick<AnimatableProps, 'animated' | 'entering' | 'index'> {
  title: string;
  subtitle?: string;
  /** Slots: avatar / icon / checkbox on the left, badge / switch / chevron on the right. */
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  size?: Size;
  onPress?: () => void;
  onLongPress?: () => void;
  swipeActions?: { left?: SwipeAction[]; right?: SwipeAction[] };
  selected?: boolean;
  divider?: boolean;
  disabled?: boolean;
}

interface ActionPanelProps {
  actions: SwipeAction[];
  side: 'left' | 'right';
  translateX: SharedValue<number>;
  height: number;
  onAction: (action: SwipeAction) => void;
  testID?: string;
}

const ActionPanel = ({ actions, side, translateX, height, onAction, testID }: ActionPanelProps) => {
  const theme = useAppTheme();
  const width = actions.length * ACTION_WIDTH;

  const style = useAnimatedStyle(() => {
    const revealed = side === 'left' ? translateX.value : -translateX.value;
    return { opacity: Math.max(0, Math.min(1, revealed / (width * 0.6))) };
  }, [side, width]);

  return (
    <Animated.View style={[styles.panel, { [side]: 0, height, width }, style]} pointerEvents="box-none">
      {actions.map((action) => {
        const colors = resolveIntent(theme, action.intent ?? 'neutral');
        return (
          <Pressable
            key={action.key}
            onPress={() => onAction(action)}
            style={[styles.action, { width: ACTION_WIDTH, backgroundColor: colors.main }]}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            testID={childTestID(testID, `action-${action.key}`)}
          >
            <Icon source={action.icon} size={theme.sizing.icon.md} color={colors.on} />
            <Text variant="labelSmall" style={{ color: colors.on, marginTop: 2 }} numberOfLines={1}>
              {action.label}
            </Text>
          </Pressable>
        );
      })}
    </Animated.View>
  );
};

const ListItemRowBase = forwardRef<View, ListItemRowProps>(function ListItemRow(
  {
    title,
    subtitle,
    leading,
    trailing,
    size = 'md',
    onPress,
    onLongPress,
    swipeActions,
    selected = false,
    divider = false,
    disabled = false,
    animated = true,
    entering = false,
    index = 0,
    style,
    containerStyle,
    testID,
  },
  ref,
) {
  const theme = useAppTheme();
  const motion = useMotion({ animated });

  const height = LIST_ITEM_HEIGHTS[size];
  const leftActions = swipeActions?.left ?? [];
  const rightActions = swipeActions?.right ?? [];
  const leftWidth = leftActions.length * ACTION_WIDTH;
  const rightWidth = rightActions.length * ACTION_WIDTH;
  const swipeable = motion.enabled && (leftWidth > 0 || rightWidth > 0) && !disabled;

  const translateX = useSharedValue(0);
  const startX = useSharedValue(0);
  const spring = theme.motion.spring.snappy;

  const close = useCallback(() => {
    translateX.value = withSpring(0, spring);
  }, [spring, translateX]);

  const handleAction = useCallback(
    (action: SwipeAction) => {
      close();
      action.onPress();
    },
    [close],
  );

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .enabled(swipeable)
        // Only claim the gesture once it is clearly horizontal, so the parent
        // list keeps its vertical scroll.
        .activeOffsetX([-12, 12])
        .failOffsetY([-10, 10])
        .onBegin(() => {
          startX.value = translateX.value;
        })
        .onUpdate((event) => {
          const next = startX.value + event.translationX;
          translateX.value = Math.max(-rightWidth, Math.min(leftWidth, next));
        })
        .onEnd((event) => {
          const projected = translateX.value + event.velocityX * 0.1;
          if (projected > leftWidth / 2 && leftWidth > 0) {
            translateX.value = withSpring(leftWidth, spring);
          } else if (projected < -rightWidth / 2 && rightWidth > 0) {
            translateX.value = withSpring(-rightWidth, spring);
          } else {
            translateX.value = withSpring(0, spring);
          }
        }),
    [leftWidth, rightWidth, spring, startX, swipeable, translateX],
  );

  const rowStyle = useAnimatedStyle(() => ({ transform: [{ translateX: translateX.value }] }));

  const handlePress = useStableCallback(onPress);
  const handleLongPress = useStableCallback(onLongPress);

  const content = (
    <View style={[styles.row, { height, paddingHorizontal: theme.spacing.md, gap: theme.spacing.md }, style]}>
      {leading}
      <View style={styles.flex}>
        <Text variant="bodyLarge" numberOfLines={1} testID={childTestID(testID, 'title')}>
          {title}
        </Text>
        {subtitle ? (
          <Text
            variant="bodySmall"
            numberOfLines={1}
            style={{ color: theme.colors.onSurfaceVariant }}
            testID={childTestID(testID, 'subtitle')}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
    </View>
  );

  return (
    <Animated.View
      ref={ref}
      entering={motion.entering(entering, index)}
      layout={motion.layout}
      style={[styles.clip, containerStyle]}
    >
      {leftActions.length > 0 && (
        <ActionPanel actions={leftActions} side="left" translateX={translateX} height={height} onAction={handleAction} testID={testID} />
      )}
      {rightActions.length > 0 && (
        <ActionPanel actions={rightActions} side="right" translateX={translateX} height={height} onAction={handleAction} testID={testID} />
      )}

      <GestureDetector gesture={pan}>
        <Animated.View
          style={[
            rowStyle,
            { backgroundColor: selected ? theme.colors.secondaryContainer : theme.colors.surface },
          ]}
        >
          {onPress || onLongPress ? (
            <TouchableRipple
              onPress={handlePress}
              onLongPress={handleLongPress}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
              accessibilityState={{ disabled, selected }}
              testID={testID}
            >
              {content}
            </TouchableRipple>
          ) : (
            <View testID={testID}>{content}</View>
          )}
          {divider ? <Divider /> : null}
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
});

/**
 * Memoised on purpose: this renders once per visible row, and an unmemoised
 * row is the single most common cause of janky lists in React Native.
 */
export const ListItemRow = memo(ListItemRowBase);
ListItemRow.displayName = 'ListItemRow';

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  panel: { position: 'absolute', top: 0, flexDirection: 'row' },
  action: { alignItems: 'center', justifyContent: 'center' },
});
