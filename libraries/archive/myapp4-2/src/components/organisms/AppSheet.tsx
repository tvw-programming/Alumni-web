import React, { forwardRef, useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { IconButton, Portal, Surface, Text } from 'react-native-paper';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useMotion, type AnimatableProps } from '@/hooks';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';

import type { StyleEscapeHatches } from '../primitives';

export type SheetVariant = 'center' | 'bottom' | 'fullscreen';

export interface AppSheetProps extends StyleEscapeHatches, Pick<AnimatableProps, 'animated'> {
  visible: boolean;
  onDismiss: () => void;
  /** One component for three presentations — retarget without touching call sites. */
  variant?: SheetVariant;
  title?: string;
  /** Slots. */
  header?: React.ReactNode;
  footer?: React.ReactNode;
  children?: React.ReactNode;
  /** Allow swipe-down / backdrop / close-button dismissal at all. */
  dismissible?: boolean;
  enableBackdropPress?: boolean;
  /** Fractions of screen height, e.g. [0.5, 0.9]. First entry is the rest position. */
  snapPoints?: number[];
  scrollable?: boolean;
  showHandle?: boolean;
}

export const AppSheet = forwardRef<View, AppSheetProps>(function AppSheet(
  {
    visible,
    onDismiss,
    variant = 'bottom',
    title,
    header,
    footer,
    children,
    dismissible = true,
    enableBackdropPress = true,
    snapPoints,
    scrollable = false,
    showHandle = true,
    animated = true,
    style,
    containerStyle,
    testID,
  },
  ref,
) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const motion = useMotion({ animated });
  const { height: screenHeight } = useWindowDimensions();

  const [mounted, setMounted] = useState(visible);
  const [contentHeight, setContentHeight] = useState(screenHeight * (snapPoints?.[0] ?? 0.5));

  const isBottom = variant === 'bottom' || variant === 'fullscreen';
  const restHeight = variant === 'fullscreen' ? screenHeight : contentHeight;

  const translateY = useSharedValue(restHeight);
  const progress = useSharedValue(0);
  const spring = theme.motion.spring.gentle;

  const finishClose = useCallback(() => setMounted(false), []);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      translateY.value = motion.enabled ? withSpring(0, spring) : 0;
      progress.value = motion.enabled ? withTiming(1, motion.timing('base')) : 1;
      return;
    }
    if (!motion.enabled) {
      progress.value = 0;
      translateY.value = restHeight;
      finishClose();
      return;
    }
    progress.value = withTiming(0, motion.timing('fast'));
    translateY.value = withTiming(restHeight, motion.timing('fast'), (done) => {
      if (done) runOnJS(finishClose)();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, restHeight, motion.enabled]);

  const requestDismiss = useCallback(() => {
    if (dismissible) onDismiss();
  }, [dismissible, onDismiss]);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .enabled(isBottom && dismissible && motion.enabled)
        .activeOffsetY([-8, 8])
        .onUpdate((event) => {
          translateY.value = Math.max(0, event.translationY);
        })
        .onEnd((event) => {
          const shouldClose = event.translationY > restHeight * 0.3 || event.velocityY > 900;
          if (shouldClose) {
            translateY.value = withTiming(restHeight, { duration: 180 }, (done) => {
              if (done) runOnJS(requestDismiss)();
            });
          } else {
            translateY.value = withSpring(0, spring);
          }
        }),
    [dismissible, isBottom, motion.enabled, requestDismiss, restHeight, spring, translateY],
  );

  // Backdrop opacity is derived from the sheet's own position, so dragging the
  // sheet down fades the backdrop with it instead of snapping at the end.
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: isBottom
      ? interpolate(translateY.value, [0, restHeight], [theme.opacity.backdrop, 0], 'clamp')
      : progress.value * theme.opacity.backdrop,
  }));

  const sheetStyle = useAnimatedStyle(() => {
    if (isBottom) return { transform: [{ translateY: translateY.value }] };
    return {
      opacity: progress.value,
      transform: [{ scale: 0.94 + progress.value * 0.06 }],
    };
  });

  if (!mounted) return null;

  const body = scrollable ? (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ padding: theme.spacing.md }}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={{ padding: theme.spacing.md }}>{children}</View>
  );

  const surface = (
    <Surface
      elevation={3}
      style={[
        variant === 'center' ? styles.centerSurface : styles.bottomSurface,
        {
          backgroundColor: theme.colors.surface,
          borderTopLeftRadius: theme.radii.xl,
          borderTopRightRadius: theme.radii.xl,
          borderRadius: variant === 'center' ? theme.radii.xl : undefined,
          paddingBottom: isBottom ? insets.bottom : 0,
          maxHeight: variant === 'fullscreen' ? undefined : screenHeight * (snapPoints?.[snapPoints.length - 1] ?? 0.9),
          height: variant === 'fullscreen' ? screenHeight : undefined,
        },
        style,
      ]}
      onLayout={(e) => {
        if (variant === 'bottom') setContentHeight(e.nativeEvent.layout.height);
      }}
      testID={testID}
    >
      {isBottom && showHandle && (
        <View style={styles.handleWell}>
          <View style={[styles.handle, { backgroundColor: theme.colors.outlineVariant, borderRadius: theme.radii.pill }]} />
        </View>
      )}

      {header ??
        (title ? (
          <View style={[styles.header, { paddingHorizontal: theme.spacing.md, paddingTop: theme.spacing.sm }]}>
            <Text variant="titleLarge" style={styles.flex} numberOfLines={1}>
              {title}
            </Text>
            {dismissible && (
              <IconButton
                icon="close"
                onPress={requestDismiss}
                accessibilityLabel="Close"
                testID={childTestID(testID, 'close')}
              />
            )}
          </View>
        ) : null)}

      {body}

      {footer ? (
        <View style={{ padding: theme.spacing.md, paddingTop: 0 }}>{footer}</View>
      ) : null}
    </Surface>
  );

  return (
    <Portal>
      <View
        ref={ref}
        style={[StyleSheet.absoluteFill, styles.root, variant === 'center' && styles.center, containerStyle]}
        accessibilityViewIsModal
        accessibilityRole="none"
        testID={childTestID(testID, 'root')}
      >
        <Animated.View
          style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }, backdropStyle]}
          onTouchEnd={enableBackdropPress ? requestDismiss : undefined}
          testID={childTestID(testID, 'backdrop')}
        />

        {isBottom ? (
          <GestureDetector gesture={pan}>
            <Animated.View style={sheetStyle}>{surface}</Animated.View>
          </GestureDetector>
        ) : (
          <Animated.View style={[styles.centerWrap, sheetStyle]}>{surface}</Animated.View>
        )}
      </View>
    </Portal>
  );
});

const styles = StyleSheet.create({
  root: { justifyContent: 'flex-end' },
  center: { justifyContent: 'center', alignItems: 'center' },
  centerWrap: { width: '86%', maxWidth: 480 },
  bottomSurface: { overflow: 'hidden' },
  centerSurface: { overflow: 'hidden' },
  handleWell: { alignItems: 'center', paddingVertical: 8 },
  handle: { width: 40, height: 4 },
  header: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
});
