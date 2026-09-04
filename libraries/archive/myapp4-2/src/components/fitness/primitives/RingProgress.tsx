import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, { useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';

import { useMotion, type AnimatableProps } from '@/hooks';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface RingSpec {
  id: string;
  progress: number;
  color: string;
  trackColor: string;
}

export interface RingProgressProps extends Pick<AnimatableProps, 'animated'> {
  /** Outermost ring first. */
  rings: RingSpec[];
  size: number;
  strokeWidth?: number;
  gap?: number;
  center?: React.ReactNode;
  testID?: string;
}

/**
 * One or more concentric progress rings, decorative to assistive tech — the
 * caller is always responsible for a real text summary alongside this (e.g.
 * "Steps: 8,420 of 10,000, 84 percent complete"), because a ring alone is
 * never the value.
 */
export const RingProgress = ({ rings, size, strokeWidth = 12, gap = 4, center, animated = true, testID }: RingProgressProps) => {
  const { enabled: motionOn } = useMotion({ animated });

  return (
    <View style={[styles.root, { width: size, height: size }]} testID={testID} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={size} height={size}>
        {rings.map((ring, index) => {
          const radius = size / 2 - strokeWidth / 2 - index * (strokeWidth + gap);
          return radius > 0 ? <RingCircle key={ring.id} ring={ring} size={size} radius={radius} strokeWidth={strokeWidth} animated={motionOn} /> : null;
        })}
      </Svg>
      {center ? <View style={styles.center}>{center}</View> : null}
    </View>
  );
};

const RingCircle = ({ ring, size, radius, strokeWidth, animated }: { ring: RingSpec; size: number; radius: number; strokeWidth: number; animated: boolean }) => {
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, ring.progress));
  const progressValue = useSharedValue(animated ? 0 : clamped);

  useEffect(() => {
    if (animated) progressValue.value = withTiming(clamped, { duration: 700 });
    else progressValue.value = clamped;
  }, [clamped, animated, progressValue]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progressValue.value),
  }));

  return (
    <>
      <Circle cx={size / 2} cy={size / 2} r={radius} stroke={ring.trackColor} strokeWidth={strokeWidth} fill="transparent" />
      <AnimatedCircle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={ring.color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        animatedProps={animatedProps}
        strokeLinecap="round"
        fill="transparent"
        rotation={-90}
        originX={size / 2}
        originY={size / 2}
      />
    </>
  );
};

const styles = StyleSheet.create({
  root: { alignItems: 'center', justifyContent: 'center' },
  center: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
});
