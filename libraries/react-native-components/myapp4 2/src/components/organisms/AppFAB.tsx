import React, { createContext, forwardRef, useContext, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { FAB, Portal } from 'react-native-paper';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useMotion, type AnimatableProps } from '@/hooks';
import { useAppTheme } from '@/theme';

import type { StyleEscapeHatches } from '../primitives';

/**
 * Screens publish their scroll offset here; the FAB and the SearchHeader both
 * subscribe. One shared value, no prop drilling, no JS-thread scroll listeners.
 */
const ScrollContext = createContext<SharedValue<number> | null>(null);

export const useScrollOffset = () => useContext(ScrollContext);

export const ScrollOffsetProvider = ({
  value,
  children,
}: {
  value: SharedValue<number>;
  children: React.ReactNode;
}) => <ScrollContext.Provider value={value}>{children}</ScrollContext.Provider>;

export interface FABAction {
  key: string;
  icon: string;
  label: string;
  onPress: () => void;
}

export interface AppFABProps extends StyleEscapeHatches, Pick<AnimatableProps, 'animated'> {
  icon?: string;
  label?: string;
  onPress?: () => void;
  variant?: 'single' | 'group' | 'extended';
  actions?: FABAction[];
  visible?: boolean;
  /** Slide out of the way when the screen scrolls down. */
  hideOnScroll?: boolean;
  accessibilityLabel?: string;
}

export const AppFAB = forwardRef<View, AppFABProps>(function AppFAB(
  {
    icon = 'plus',
    label,
    onPress,
    variant = 'single',
    actions = [],
    visible = true,
    hideOnScroll = false,
    animated = true,
    style,
    containerStyle,
    testID,
    accessibilityLabel,
  },
  ref,
) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const motion = useMotion({ animated });
  const [open, setOpen] = useState(false);
  const scrollOffset = useScrollOffset();
  const fallback = useSharedValue(0);
  const offset = scrollOffset ?? fallback;

  const spring = theme.motion.spring.snappy;
  const hideStyle = useAnimatedStyle(() => {
    const shouldHide = hideOnScroll && motion.enabled && offset.value > 120;
    const hidden = !visible || shouldHide;
    return {
      transform: [{ translateY: withSpring(hidden ? 120 : 0, spring) }],
      opacity: withSpring(hidden ? 0 : 1, spring),
    };
  }, [hideOnScroll, visible, motion.enabled]);

  const groupActions = useMemo(
    () => actions.map((a) => ({ icon: a.icon, label: a.label, onPress: a.onPress })),
    [actions],
  );

  if (variant === 'group') {
    return (
      <Portal>
        <FAB.Group
          open={open}
          visible={visible}
          icon={open ? 'close' : icon}
          actions={groupActions}
          onStateChange={({ open: next }) => setOpen(next)}
          onPress={open ? undefined : onPress}
          accessibilityLabel={accessibilityLabel ?? label ?? 'Actions'}
          testID={testID}
        />
      </Portal>
    );
  }

  return (
    <Animated.View
      ref={ref}
      style={[
        styles.root,
        { right: theme.spacing.md, bottom: insets.bottom + theme.spacing.md },
        containerStyle,
        hideStyle,
      ]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <FAB
        icon={icon}
        label={variant === 'extended' ? label : undefined}
        onPress={onPress}
        style={style}
        accessibilityLabel={accessibilityLabel ?? label ?? icon}
        accessibilityRole="button"
        testID={testID}
      />
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  root: { position: 'absolute' },
});
