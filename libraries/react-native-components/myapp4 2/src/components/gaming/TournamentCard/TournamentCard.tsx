import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, ProgressBar, Text } from 'react-native-paper';

import { AppButton } from '@ui/atoms/AppButton';
import { AppCard } from '@ui/molecules/AppCard';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useGameTheme } from '../theme/gamingTokens';
import type { Tournament, TournamentStatus } from '../types/domain';
import { CountdownTimer } from '../ScoreAndTimer/CountdownTimer';

const STATUS_META: Record<TournamentStatus, { label: string; icon: string; colorKey: 'statusInProgress' | 'success' | 'statusLocked' | 'statusError' }> = {
  upcoming: { label: 'Upcoming', icon: 'calendar-clock-outline', colorKey: 'statusLocked' },
  registrationOpen: { label: 'Registration open', icon: 'clipboard-check-outline', colorKey: 'success' },
  inProgress: { label: 'In progress', icon: 'sword-cross', colorKey: 'statusInProgress' },
  ended: { label: 'Tournament ended', icon: 'flag-checkered', colorKey: 'statusLocked' },
  canceled: { label: 'Canceled', icon: 'cancel', colorKey: 'statusError' },
};

export interface TournamentCardProps extends StyleEscapeHatches {
  tournament: Tournament;
  onJoin?: (tournament: Tournament) => void;
  onViewBracket?: (tournament: Tournament) => void;
  onViewRules?: (tournament: Tournament) => void;
}

/**
 * Eligibility and cost are stated before the join action is even enabled —
 * this card never lets a tap surprise a player with a requirement it already
 * knew about. Live-update tolerant: a stale `participantCount` degrades
 * gracefully rather than showing a broken ratio.
 */
export const TournamentCard = ({ tournament, onJoin, onViewBracket, onViewRules, style, containerStyle, testID }: TournamentCardProps) => {
  const theme = useAppTheme();
  const gaming = useGameTheme();
  const id = testID ?? `tournament-${tournament.id}`;
  const meta = STATUS_META[tournament.status];
  const full = tournament.maxParticipants != null && tournament.participantCount != null && tournament.participantCount >= tournament.maxParticipants;
  const canJoin = tournament.status === 'registrationOpen' && tournament.userStatus !== 'registered' && tournament.userStatus !== 'ineligible';

  return (
    <AppCard variant="outlined" containerStyle={containerStyle} style={style} testID={id}>
      <View style={{ gap: theme.spacing.sm }}>
        <View style={styles.row}>
          <Text variant="titleSmall" style={styles.flex}>
            {tournament.title}
          </Text>
          <View style={styles.row}>
            <Icon source={meta.icon} size={13} color={gaming.colors[meta.colorKey]} />
            <Text variant="labelSmall" style={{ color: gaming.colors[meta.colorKey], marginLeft: 4 }}>
              {meta.label}
            </Text>
          </View>
        </View>

        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {tournament.mode}
          {tournament.currentRoundLabel ? ` · ${tournament.currentRoundLabel}` : ''}
        </Text>

        {(tournament.status === 'upcoming' || tournament.status === 'registrationOpen') ? (
          <CountdownTimer endsAt={tournament.startsAt} status="running" announceAt={[]} />
        ) : null}

        {tournament.entryRequirement ? (
          <View style={styles.row}>
            <Icon source="shield-star-outline" size={13} color={theme.colors.onSurfaceVariant} />
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 4, flex: 1 }}>
              {tournament.entryRequirement}
            </Text>
          </View>
        ) : null}

        {tournament.prizeLabel ? (
          <View style={styles.row}>
            <Icon source="trophy-outline" size={13} color={gaming.colors.rarityLegendary} />
            <Text variant="labelSmall" style={{ color: gaming.colors.rarityLegendary, marginLeft: 4 }}>
              Prize pool: {tournament.prizeLabel}
            </Text>
          </View>
        ) : null}

        {tournament.maxParticipants != null && tournament.participantCount != null ? (
          <View style={{ gap: 2 }}>
            <ProgressBar
              progress={Math.min(1, tournament.participantCount / tournament.maxParticipants)}
              color={full ? gaming.colors.warning : gaming.colors.statusInProgress}
              style={{ height: 5, borderRadius: theme.radii.pill, backgroundColor: gaming.colors.progressTrack }}
            />
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {tournament.participantCount} / {tournament.maxParticipants} players{full ? ' · Full' : ''}
            </Text>
          </View>
        ) : null}

        {tournament.userStatus === 'ineligible' ? (
          <Text variant="labelSmall" style={{ color: gaming.colors.statusError }}>
            You don't meet the entry requirement for this tournament.
          </Text>
        ) : tournament.userStatus === 'waitlisted' ? (
          <Text variant="labelSmall" style={{ color: gaming.colors.warning }}>
            You're on the waitlist.
          </Text>
        ) : tournament.userStatus === 'registered' ? (
          <Text variant="labelSmall" style={{ color: gaming.colors.success }}>
            You're registered.
          </Text>
        ) : null}

        <View style={[styles.row, { gap: theme.spacing.sm }]}>
          {onViewRules ? (
            <AppButton variant="ghost" size="sm" onPress={() => onViewRules(tournament)} testID={childTestID(id, 'rules')}>
              Rules
            </AppButton>
          ) : null}
          {tournament.status === 'inProgress' && onViewBracket ? (
            <AppButton variant="secondary" size="sm" containerStyle={styles.flex} onPress={() => onViewBracket(tournament)} testID={childTestID(id, 'bracket')}>
              View bracket
            </AppButton>
          ) : onJoin ? (
            <AppButton
              variant="primary"
              size="sm"
              containerStyle={styles.flex}
              disabled={!canJoin || full}
              onPress={() => onJoin(tournament)}
              testID={childTestID(id, 'join')}
            >
              {tournament.userStatus === 'registered' ? "You're registered" : full ? 'Full' : 'Join tournament'}
            </AppButton>
          ) : null}
        </View>
      </View>
    </AppCard>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
});
