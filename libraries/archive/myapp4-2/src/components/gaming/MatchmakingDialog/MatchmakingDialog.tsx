import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Icon, Text } from 'react-native-paper';

import { AppButton } from '@ui/atoms/AppButton';
import { AppSheet } from '@ui/organisms/AppSheet';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useGameTheme } from '../theme/gamingTokens';
import type { MatchmakingModel, MatchmakingState } from '../types/domain';

const STATE_COPY: Record<MatchmakingState, string> = {
  idle: 'Ready to search',
  queueing: 'Joining queue…',
  searching: 'Finding a match',
  matchFound: 'Match found',
  starting: 'Starting match…',
  canceling: 'Canceling search…',
  canceled: 'Search canceled',
  timeout: "We couldn't find a match",
  error: 'Connection lost',
};

const formatElapsed = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

/**
 * A calm, focused sheet — matchmaking sockets and party state live in a
 * service or hook; this component only ever renders the state it's given.
 * Motion here is limited to a single indeterminate spinner, so reduced-motion
 * users lose nothing but a spin.
 */
export interface MatchmakingDialogProps extends StyleEscapeHatches {
  visible: boolean;
  model: MatchmakingModel;
  onCancel: () => void;
  onRetry?: () => void;
  onAcceptMatch?: () => void;
  onDismiss?: () => void;
}

export const MatchmakingDialog = ({ visible, model, onCancel, onRetry, onAcceptMatch, onDismiss, style, containerStyle, testID }: MatchmakingDialogProps) => {
  const theme = useAppTheme();
  const gaming = useGameTheme();
  const id = testID ?? 'matchmaking-dialog';
  const active = model.state === 'queueing' || model.state === 'searching' || model.state === 'starting';
  const failed = model.state === 'timeout' || model.state === 'error';

  return (
    <AppSheet
      visible={visible}
      onDismiss={onDismiss ?? (() => {})}
      variant="center"
      dismissible={failed || model.state === 'canceled'}
      scrollable={false}
      style={style}
      containerStyle={containerStyle}
      testID={id}
    >
      <View style={{ padding: theme.spacing.lg, alignItems: 'center', gap: theme.spacing.md }}>
        {active ? (
          <ActivityIndicator size={40} color={gaming.colors.statusInProgress} accessibilityLabel="Searching for players" />
        ) : model.state === 'matchFound' ? (
          <Icon source="check-circle" size={40} color={gaming.colors.success} />
        ) : failed ? (
          <Icon source="wifi-alert" size={40} color={gaming.colors.statusError} />
        ) : (
          <Icon source="magnify" size={40} color={theme.colors.onSurfaceVariant} />
        )}

        <Text variant="titleMedium" accessibilityLiveRegion="polite">
          {STATE_COPY[model.state]}
        </Text>

        <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
          {model.mode} · {model.partySize} player{model.partySize === 1 ? '' : 's'}
          {model.region ? ` · ${model.region}` : ''}
        </Text>

        {active ? (
          <View style={styles.statRow}>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Elapsed: {formatElapsed(model.elapsedSeconds)}
            </Text>
            {model.estimatedWait ? (
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Estimated wait: {model.estimatedWait}
              </Text>
            ) : null}
          </View>
        ) : null}

        {failed ? (
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
            {model.state === 'timeout' ? 'No opponents were available in time.' : 'Check your connection and try again.'}
          </Text>
        ) : null}

        {model.cancellationPenaltyNote && active ? (
          <Text variant="labelSmall" style={{ color: gaming.colors.warning, textAlign: 'center' }}>
            {model.cancellationPenaltyNote}
          </Text>
        ) : null}

        <View style={{ gap: theme.spacing.sm, width: '100%' }}>
          {model.state === 'matchFound' && onAcceptMatch ? (
            <AppButton variant="primary" size="lg" fullWidth onPress={onAcceptMatch} testID={childTestID(id, 'accept')}>
              Accept match
            </AppButton>
          ) : null}
          {active ? (
            <AppButton variant="ghost" size="md" fullWidth loading={model.state === 'starting'} onPress={onCancel} testID={childTestID(id, 'cancel')}>
              Cancel search
            </AppButton>
          ) : null}
          {failed && onRetry ? (
            <AppButton variant="primary" size="lg" fullWidth onPress={onRetry} testID={childTestID(id, 'retry')}>
              Try again
            </AppButton>
          ) : null}
        </View>
      </View>
    </AppSheet>
  );
};

const styles = StyleSheet.create({
  statRow: { flexDirection: 'row', gap: 16 },
});
