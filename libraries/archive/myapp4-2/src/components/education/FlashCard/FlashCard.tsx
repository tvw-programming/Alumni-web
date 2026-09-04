import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import { Icon, Text, TouchableRipple } from 'react-native-paper';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { AppButton } from '@ui/atoms/AppButton';
import { StateView } from '@ui/molecules/StateView';
import { useMotion, type AnimatableProps } from '@/hooks';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useLearnTheme } from '../theme/educationTokens';
import type { FlashCardData, Mastery, RecallResponse } from '../types/domain';

const MASTERY_META: Record<Mastery, { label: string; icon: string; colorKey: 'masteryNew' | 'masteryLearning' | 'masteryReview' | 'masteryMastered' }> = {
  new: { label: 'New', icon: 'sparkles', colorKey: 'masteryNew' },
  learning: { label: 'Learning', icon: 'progress-clock', colorKey: 'masteryLearning' },
  review: { label: 'Review', icon: 'refresh', colorKey: 'masteryReview' },
  mastered: { label: 'Mastered', icon: 'check-decagram', colorKey: 'masteryMastered' },
};

const RECALL_OPTIONS: Array<{ id: RecallResponse; label: string; hint: string }> = [
  { id: 'again', label: 'Again', hint: "Didn't recall it" },
  { id: 'hard', label: 'Hard', hint: 'Recalled with effort' },
  { id: 'good', label: 'Good', hint: 'Recalled correctly' },
  { id: 'easy', label: 'Easy', hint: 'Recalled instantly' },
];

export interface FlashCardProps extends StyleEscapeHatches, Pick<AnimatableProps, 'animated'> {
  card: FlashCardData;
  /** 1-based position in the session. */
  position?: number;
  total?: number;
  /** Controlled reveal, so a parent can reset between cards. */
  revealed?: boolean;
  onRevealChange?: (revealed: boolean) => void;
  /** The scheduler consumes this — the card never computes an interval. */
  onRespond?: (card: FlashCardData, response: RecallResponse) => void;
  onNext?: () => void;
  onPrevious?: () => void;
  onPlayAudio?: (card: FlashCardData) => void;
  audioFailed?: boolean;
  loading?: boolean;
  errorMessage?: string;
}

/**
 * A single flashcard.
 *
 * Essential content is never locked behind the flip animation: "Show answer" is
 * a real button, the reveal is announced, and with reduced motion the card
 * cross-fades instead of rotating. The card emits a recall response and nothing
 * more — scheduling intervals belong to the review engine.
 */
export const FlashCard = ({
  card,
  position,
  total,
  revealed,
  onRevealChange,
  onRespond,
  onNext,
  onPrevious,
  onPlayAudio,
  audioFailed = false,
  loading = false,
  errorMessage,
  animated = true,
  style,
  containerStyle,
  testID,
}: FlashCardProps) => {
  const theme = useAppTheme();
  const learn = useLearnTheme();
  const motion = useMotion({ animated });

  const id = testID ?? `flashcard-${card.id}`;
  const [internalRevealed, setInternalRevealed] = useState(false);
  const showBack = revealed ?? internalRevealed;

  const flip = useSharedValue(showBack ? 1 : 0);

  useEffect(() => {
    flip.value = motion.enabled ? withTiming(showBack ? 1 : 0, motion.timing('base', 'emphasized')) : showBack ? 1 : 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showBack, motion.enabled]);

  const setRevealed = useCallback(
    (next: boolean) => {
      if (revealed == null) setInternalRevealed(next);
      onRevealChange?.(next);
      // Announce which side is visible — the animation is not the message.
      AccessibilityInfo.announceForAccessibility(next ? 'Answer shown' : 'Question shown');
    },
    [onRevealChange, revealed],
  );

  /**
   * With motion enabled this is a 3D flip; with reduced motion it is a plain
   * cross-fade. Either way the text is readable at every point.
   */
  const frontStyle = useAnimatedStyle(() =>
    motion.enabled
      ? {
          opacity: interpolate(flip.value, [0, 0.5, 1], [1, 0, 0]),
          transform: [{ perspective: 800 }, { rotateY: `${interpolate(flip.value, [0, 1], [0, 180])}deg` }],
        }
      : { opacity: flip.value > 0.5 ? 0 : 1 },
  );

  const backStyle = useAnimatedStyle(() =>
    motion.enabled
      ? {
          opacity: interpolate(flip.value, [0, 0.5, 1], [0, 0, 1]),
          transform: [{ perspective: 800 }, { rotateY: `${interpolate(flip.value, [0, 1], [180, 360])}deg` }],
        }
      : { opacity: flip.value > 0.5 ? 1 : 0 },
  );

  const mastery = card.mastery ? MASTERY_META[card.mastery] : null;

  if (loading) {
    return (
      <View
        style={[
          styles.card,
          { minHeight: learn.layout.flashCardMinHeight, backgroundColor: theme.colors.surfaceVariant, borderRadius: theme.radii.lg },
          containerStyle,
        ]}
        testID={childTestID(id, 'loading')}
      />
    );
  }

  if (errorMessage) {
    return (
      <StateView
        preset="error"
        compact
        title="This card isn't available"
        description={errorMessage}
        primaryAction={onNext ? { label: 'Skip to next card', onPress: onNext } : undefined}
        containerStyle={containerStyle}
        testID={childTestID(id, 'error')}
      />
    );
  }

  return (
    <View style={[{ gap: theme.spacing.md }, containerStyle, style]} testID={id}>
      <View style={styles.headerRow}>
        {position && total ? (
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            Card {position} of {total}
          </Text>
        ) : (
          <View />
        )}
        {mastery ? (
          <View style={[styles.row, { gap: 3 }]}>
            <Icon source={mastery.icon} size={12} color={learn.colors[mastery.colorKey]} />
            <Text variant="labelSmall" style={{ color: learn.colors[mastery.colorKey] }}>
              {mastery.label}
            </Text>
          </View>
        ) : null}
      </View>

      <TouchableRipple
        onPress={() => setRevealed(!showBack)}
        borderless
        style={{ borderRadius: theme.radii.lg }}
        accessibilityRole="button"
        // The accessible name always carries the visible side's content.
        accessibilityLabel={
          showBack ? `Answer: ${card.back}. Tap to show the question.` : `Question: ${card.front}. Tap to show the answer.`
        }
        accessibilityState={{ expanded: showBack }}
        testID={childTestID(id, 'surface')}
      >
        <View
          style={[
            styles.card,
            {
              minHeight: learn.layout.flashCardMinHeight,
              backgroundColor: theme.colors.surface,
              borderRadius: theme.radii.lg,
              borderColor: theme.colors.outlineVariant,
              padding: theme.spacing.lg,
            },
          ]}
        >
          <Animated.View style={[StyleSheet.absoluteFill, styles.face, frontStyle]}>
            <Text variant="headlineSmall" style={styles.centerText} selectable>
              {card.front}
            </Text>
            {card.hint && !showBack ? (
              <Text variant="labelSmall" style={[styles.centerText, { color: theme.colors.onSurfaceVariant, marginTop: 8 }]}>
                Hint: {card.hint}
              </Text>
            ) : null}
          </Animated.View>

          <Animated.View style={[StyleSheet.absoluteFill, styles.face, backStyle]}>
            <Text variant="titleMedium" style={styles.centerText} selectable>
              {card.back}
            </Text>
          </Animated.View>
        </View>
      </TouchableRipple>

      {onPlayAudio ? (
        <View style={styles.centerRow}>
          <AppButton
            variant="ghost"
            size="sm"
            icon={audioFailed ? 'volume-off' : 'volume-high'}
            onPress={() => onPlayAudio(card)}
            testID={childTestID(id, 'audio')}
          >
            {audioFailed ? 'Audio unavailable' : 'Play audio'}
          </AppButton>
        </View>
      ) : null}

      {/* A real button, not only a tap-to-flip gesture. */}
      {!showBack ? (
        <AppButton variant="primary" fullWidth onPress={() => setRevealed(true)} testID={childTestID(id, 'reveal')}>
          Show answer
        </AppButton>
      ) : (
        <View style={{ gap: theme.spacing.sm }}>
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
            How well did you recall it?
          </Text>
          <View style={[styles.recallRow, { gap: theme.spacing.xs }]}>
            {RECALL_OPTIONS.map((option) => (
              <AppButton
                key={option.id}
                variant={option.id === 'again' ? 'secondary' : 'primary'}
                size="sm"
                containerStyle={styles.flex}
                onPress={() => {
                  onRespond?.(card, option.id);
                  setRevealed(false);
                }}
                accessibilityLabel={`${option.label} — ${option.hint}`}
                testID={childTestID(id, `recall-${option.id}`)}
              >
                {option.label}
              </AppButton>
            ))}
          </View>
        </View>
      )}

      <View style={[styles.headerRow, { gap: theme.spacing.md }]}>
        {onPrevious ? (
          <AppButton variant="ghost" size="sm" icon="chevron-left" onPress={onPrevious} testID={childTestID(id, 'previous')}>
            Previous
          </AppButton>
        ) : (
          <View />
        )}
        {onNext ? (
          <AppButton variant="ghost" size="sm" icon="chevron-right" iconPosition="right" onPress={onNext} testID={childTestID(id, 'next')}>
            Next card
          </AppButton>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth * 2, overflow: 'hidden', justifyContent: 'center' },
  face: { alignItems: 'center', justifyContent: 'center', padding: 24, backfaceVisibility: 'hidden' },
  centerText: { textAlign: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  row: { flexDirection: 'row', alignItems: 'center' },
  centerRow: { flexDirection: 'row', justifyContent: 'center' },
  recallRow: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
});
