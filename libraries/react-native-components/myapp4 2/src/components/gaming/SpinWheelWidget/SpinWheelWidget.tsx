import React, { useEffect, useMemo } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Icon, Text, TouchableRipple } from 'react-native-paper';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { AppButton } from '@ui/atoms/AppButton';
import { useMotion, type AnimatableProps } from '@/hooks';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useGameTheme } from '../theme/gamingTokens';
import type { AchievementRarity, SpinReward, SpinWheelState } from '../types/domain';

const RARITY_COLOR_KEY: Record<AchievementRarity, 'rarityCommon' | 'rarityRare' | 'rarityEpic' | 'rarityLegendary'> = {
  common: 'rarityCommon',
  rare: 'rarityRare',
  epic: 'rarityEpic',
  legendary: 'rarityLegendary',
};

export interface SpinWheelWidgetProps extends StyleEscapeHatches, Pick<AnimatableProps, 'animated'> {
  rewards: SpinReward[];
  state: SpinWheelState;
  /** The result the server already selected — the wheel only visualizes it. */
  resultReward?: SpinReward;
  spinCost?: string;
  balanceLabel?: string;
  freeSpins?: number;
  ageRestrictionLabel?: string;
  onSpin: () => void;
  onClaim?: () => void;
  onViewOdds?: () => void;
}

/**
 * The server determines the outcome before the wheel ever moves — this
 * component receives `resultReward` and only spins to *that* segment. It
 * never picks a winner client-side, and the paid/free state and cost are
 * always visible before the spin button is pressed, never revealed after.
 */
export const SpinWheelWidget = ({
  rewards,
  state,
  resultReward,
  spinCost,
  balanceLabel,
  freeSpins,
  ageRestrictionLabel,
  onSpin,
  onClaim,
  onViewOdds,
  animated = true,
  style,
  containerStyle,
  testID,
}: SpinWheelWidgetProps) => {
  const theme = useAppTheme();
  const gaming = useGameTheme();
  const { enabled: motionOn } = useMotion({ animated });
  const id = testID ?? 'spin-wheel-widget';
  const rotation = useSharedValue(0);

  const size = gaming.layout.wheelSize;
  const stroke = 28;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const segmentLength = circumference / Math.max(1, rewards.length);

  useEffect(() => {
    if (state !== 'spinning' || !resultReward) return;
    const targetIndex = Math.max(0, rewards.findIndex((r) => r.id === resultReward.id));
    const targetAngle = (targetIndex / rewards.length) * 360;
    const spins = 4 * 360;
    if (motionOn) {
      rotation.value = withTiming(rotation.value + spins + (360 - targetAngle), { duration: 2200 });
    } else {
      rotation.value = rotation.value + spins + (360 - targetAngle);
    }
  }, [state, resultReward, rewards, motionOn, rotation]);

  const wheelStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value}deg` }] }));

  const insufficientCurrency = state === 'insufficientCurrency';
  const spinning = state === 'spinning';
  const showResult = state === 'result' || state === 'claiming' || state === 'claimed';

  const a11ySummary = useMemo(
    () => rewards.map((r) => `${r.label}${r.rarity ? `, ${r.rarity}` : ''}${r.odds != null ? `, ${r.odds}% chance` : ''}`).join('; '),
    [rewards],
  );

  return (
    <View style={[containerStyle, style]} testID={id}>
      <View style={styles.balanceRow}>
        {balanceLabel ? (
          <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            {balanceLabel}
          </Text>
        ) : null}
        {freeSpins != null && freeSpins > 0 ? (
          <Text variant="labelMedium" style={{ color: gaming.colors.success }}>
            {freeSpins} free spin{freeSpins === 1 ? '' : 's'} remaining
          </Text>
        ) : null}
      </View>

      <View style={[styles.wheelWrap, { width: size, height: size }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Animated.View style={wheelStyle}>
          <Svg width={size} height={size}>
            {rewards.map((reward, index) => {
              const colorKey = reward.rarity ? RARITY_COLOR_KEY[reward.rarity] : 'rarityCommon';
              return (
                <Circle
                  key={reward.id}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke={gaming.colors[colorKey]}
                  strokeWidth={stroke}
                  strokeDasharray={`${segmentLength - 3} ${circumference - segmentLength + 3}`}
                  strokeDashoffset={-index * segmentLength}
                  fill="transparent"
                />
              );
            })}
          </Svg>
        </Animated.View>
        <View style={styles.wheelCenter}>
          <Icon source="star-four-points-outline" size={28} color={theme.colors.onSurface} />
        </View>
        <View style={[styles.pointer, { borderBottomColor: theme.colors.onSurface }]} />
      </View>

      {/* Mandatory text alternative to the wheel graphic */}
      <Text accessibilityRole="text" style={styles.srOnly}>
        {`Spin wheel with ${rewards.length} rewards: ${a11ySummary}`}
      </Text>

      {showResult && resultReward ? (
        <View style={styles.resultRow} accessibilityLiveRegion="polite">
          {resultReward.icon?.uri ? (
            <Image source={{ uri: resultReward.icon.uri }} style={styles.resultIcon} resizeMode="contain" accessibilityElementsHidden />
          ) : (
            <Icon source="gift-outline" size={24} color={theme.colors.onSurface} />
          )}
          <Text variant="titleMedium" style={{ marginLeft: 8 }}>
            You won {resultReward.quantity}× {resultReward.label}
          </Text>
        </View>
      ) : null}

      {insufficientCurrency ? (
        <Text variant="labelMedium" style={{ color: gaming.colors.statusError, textAlign: 'center', marginTop: theme.spacing.sm }}>
          Not enough gems
        </Text>
      ) : null}

      {ageRestrictionLabel ? (
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 4 }}>
          {ageRestrictionLabel}
        </Text>
      ) : null}

      <View style={{ gap: theme.spacing.sm, marginTop: theme.spacing.md }}>
        {showResult && onClaim ? (
          <AppButton variant="primary" size="lg" fullWidth loading={state === 'claiming'} onPress={onClaim} testID={childTestID(id, 'claim')}>
            {state === 'claimed' ? 'Reward added' : 'Claim reward'}
          </AppButton>
        ) : (
          <AppButton variant="primary" size="lg" fullWidth loading={spinning} disabled={insufficientCurrency} onPress={onSpin} testID={childTestID(id, 'spin')}>
            {freeSpins != null && freeSpins > 0 ? 'Free spin' : spinCost ? `Spin · ${spinCost}` : 'Spin for rewards'}
          </AppButton>
        )}
        {onViewOdds ? (
          <Text variant="labelSmall" onPress={onViewOdds} accessibilityRole="button" style={{ color: theme.colors.primary, textAlign: 'center' }} testID={childTestID(id, 'odds')}>
            View odds
          </Text>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  wheelWrap: { alignSelf: 'center', alignItems: 'center', justifyContent: 'center' },
  wheelCenter: { position: 'absolute', width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' },
  pointer: { position: 'absolute', top: -4, width: 0, height: 0, borderLeftWidth: 8, borderRightWidth: 8, borderBottomWidth: 14, borderLeftColor: 'transparent', borderRightColor: 'transparent' },
  resultRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  resultIcon: { width: 24, height: 24 },
  srOnly: { position: 'absolute', width: 1, height: 1, overflow: 'hidden' },
});
