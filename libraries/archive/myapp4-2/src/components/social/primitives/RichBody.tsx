import React, { memo, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';

import { useSocialTheme } from '../theme/socialTokens';
import type { RichText, UserSummary } from '../types/domain';

/** Matches @mentions, #hashtags and bare URLs. */
const TOKEN_PATTERN = /(@[A-Za-z0-9_.]+|#[A-Za-z0-9_]+|https?:\/\/\S+)/g;

export interface RichBodyProps {
  body: RichText;
  /** Characters shown before the "Show more" affordance. */
  truncateAt?: number;
  mentions?: UserSummary[];
  onMentionPress?: (handle: string) => void;
  onHashtagPress?: (tag: string) => void;
  onLinkPress?: (url: string) => void;
  variant?: 'bodyMedium' | 'bodySmall' | 'bodyLarge';
  color?: string;
  translatedFrom?: string;
  onShowOriginal?: () => void;
  testID?: string;
}

/**
 * Post and comment text with inline entities.
 *
 * Mentions and links are styled *and* rendered as separate focusable targets,
 * because a coloured run of text inside a paragraph is invisible to a screen
 * reader and unreachable by keyboard. "Show more" is a real control, and
 * expanding never reflows the surrounding list unpredictably.
 */
export const RichBody = memo(function RichBody({
  body,
  truncateAt = 280,
  onMentionPress,
  onHashtagPress,
  onLinkPress,
  variant = 'bodyMedium',
  color,
  translatedFrom,
  onShowOriginal,
  testID,
}: RichBodyProps) {
  const theme = useAppTheme();
  const social = useSocialTheme();
  const [expanded, setExpanded] = useState(false);

  const long = body.length > truncateAt;
  const shown = expanded || !long ? body : `${body.slice(0, truncateAt).trimEnd()}…`;

  const segments = useMemo(() => shown.split(TOKEN_PATTERN).filter((part) => part.length > 0), [shown]);

  return (
    <View testID={testID}>
      <Text variant={variant} style={{ color: color ?? theme.colors.onSurface }} selectable>
        {segments.map((segment, index) => {
          if (segment.startsWith('@')) {
            return (
              <Text
                key={`${segment}-${index}`}
                style={{ color: social.colors.mention }}
                accessibilityRole="link"
                accessibilityLabel={`Mention of ${segment}`}
                onPress={onMentionPress ? () => onMentionPress(segment) : undefined}
              >
                {segment}
              </Text>
            );
          }
          if (segment.startsWith('#')) {
            return (
              <Text
                key={`${segment}-${index}`}
                style={{ color: social.colors.link }}
                accessibilityRole="link"
                accessibilityLabel={`Hashtag ${segment.slice(1)}`}
                onPress={onHashtagPress ? () => onHashtagPress(segment.slice(1)) : undefined}
              >
                {segment}
              </Text>
            );
          }
          if (segment.startsWith('http')) {
            return (
              <Text
                key={`${segment}-${index}`}
                style={{ color: social.colors.link, textDecorationLine: 'underline' }}
                accessibilityRole="link"
                accessibilityLabel={`Link to ${segment}`}
                onPress={onLinkPress ? () => onLinkPress(segment) : undefined}
              >
                {segment}
              </Text>
            );
          }
          return <Text key={`text-${index}`}>{segment}</Text>;
        })}
      </Text>

      {long ? (
        <Text
          variant="labelMedium"
          onPress={() => setExpanded((prev) => !prev)}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          style={{ color: theme.colors.primary, marginTop: 2 }}
          testID={childTestID(testID, 'toggle')}
        >
          {expanded ? 'Show less' : 'Show more'}
        </Text>
      ) : null}

      {translatedFrom ? (
        <Text
          variant="labelSmall"
          onPress={onShowOriginal}
          accessibilityRole={onShowOriginal ? 'button' : 'text'}
          style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}
        >
          Translated from {translatedFrom} · Show original
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({});
