import React, { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Chip, Icon, IconButton, ProgressBar, Text } from 'react-native-paper';

import { AppButton } from '@ui/atoms/AppButton';
import { AppCard } from '@ui/molecules/AppCard';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useGameTheme } from '../theme/gamingTokens';
import type { GameCardData, GamePrimaryAction } from '../types/domain';

const ACTION_LABEL: Record<GamePrimaryAction, string> = {
  play: 'Play',
  install: 'Install',
  buy: 'Buy now',
  resume: 'Resume',
  update: 'Update',
};

export interface GameCardProps extends StyleEscapeHatches {
  game: GameCardData;
  onPrimaryAction: (game: GameCardData) => void;
  onOpen?: (game: GameCardData) => void;
  onWishlist?: (game: GameCardData, next: boolean) => void;
}

/**
 * Installation uses `ProgressBar` for known percentage and `ActivityIndicator`
 * only when work is genuinely indeterminate (e.g. "preparing to install").
 * Ownership, subscription and platform rules are supplied as props — the
 * card never infers "owned" from a locally cached flag.
 */
export const GameCard = ({ game, onPrimaryAction, onOpen, onWishlist, style, containerStyle, testID }: GameCardProps) => {
  const theme = useAppTheme();
  const gaming = useGameTheme();
  const id = testID ?? `game-card-${game.id}`;
  const [imgStatus, setImgStatus] = useState<'loading' | 'loaded' | 'error'>(game.cover?.uri ? 'loading' : 'error');

  const installing = game.installState === 'installing' || game.installState === 'updating';
  const locked = game.ownership === 'locked';

  return (
    <AppCard variant="outlined" padded={false} containerStyle={containerStyle} style={style} testID={id}>
      <View style={[styles.cover, { aspectRatio: gaming.layout.coverAspectRatio, backgroundColor: theme.colors.surfaceVariant }]}>
        {game.cover?.uri && imgStatus !== 'error' ? (
          <Image
            source={{ uri: game.cover.uri }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            onLoad={() => setImgStatus('loaded')}
            onError={() => setImgStatus('error')}
            accessibilityElementsHidden
          />
        ) : (
          <View style={styles.coverFallback}>
            <Icon source="controller-classic-outline" size={28} color={theme.colors.onSurfaceVariant} />
          </View>
        )}

        {onWishlist ? (
          <IconButton
            icon={game.wishlisted ? 'heart' : 'heart-outline'}
            iconColor={game.wishlisted ? gaming.colors.rarityLegendary : '#FFFFFF'}
            containerColor="rgba(0,0,0,0.4)"
            size={18}
            style={styles.wishlistButton}
            onPress={() => onWishlist(game, !game.wishlisted)}
            accessibilityLabel={game.wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            accessibilityState={{ selected: game.wishlisted }}
            testID={childTestID(id, 'wishlist')}
          />
        ) : null}

        {game.platform ? (
          <View style={[styles.platformBadge, { backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: theme.radii.sm }]}>
            <Text variant="labelSmall" style={{ color: '#FFFFFF' }}>
              {game.platform}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={{ padding: theme.spacing.sm, gap: 4 }}>
        <Text variant="titleSmall" numberOfLines={1} onPress={onOpen ? () => onOpen(game) : undefined}>
          {game.title}
        </Text>

        {game.genres && game.genres.length > 0 ? (
          <View style={styles.chipRow}>
            {game.genres.slice(0, 2).map((genre) => (
              <Chip key={genre} compact mode="outlined" style={styles.chip} textStyle={styles.chipText}>
                {genre}
              </Chip>
            ))}
          </View>
        ) : null}

        {game.downloadSizeLabel ? (
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {game.downloadSizeLabel}
          </Text>
        ) : null}

        {game.ownership === 'subscription' ? (
          <Text variant="labelSmall" style={{ color: gaming.colors.statusInProgress }}>
            Available through Game Pass
          </Text>
        ) : null}

        {game.parentalRestriction ? (
          <View style={styles.row}>
            <Icon source="account-lock-outline" size={13} color={gaming.colors.statusError} />
            <Text variant="labelSmall" style={{ color: gaming.colors.statusError, marginLeft: 4 }}>
              Restricted by parental controls
            </Text>
          </View>
        ) : null}

        {installing ? (
          <View style={{ gap: 2 }}>
            <ProgressBar
              progress={game.progress ?? 0}
              color={gaming.colors.statusInProgress}
              style={{ height: 6, borderRadius: theme.radii.pill, backgroundColor: gaming.colors.progressTrack }}
              accessibilityLabel={`${game.installState === 'updating' ? 'Updating' : 'Installing'}, ${Math.round((game.progress ?? 0) * 100)} percent`}
            />
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {game.installState === 'updating' ? 'Updating' : 'Installing'}… {Math.round((game.progress ?? 0) * 100)}%
            </Text>
          </View>
        ) : game.installState === 'paused' ? (
          <Text variant="labelSmall" style={{ color: gaming.colors.warning }}>
            Paused
          </Text>
        ) : game.installState === 'error' ? (
          <Text variant="labelSmall" style={{ color: gaming.colors.statusError }}>
            {game.errorMessage ?? 'Download failed'}
          </Text>
        ) : null}

        {game.offlinePlayable === false ? (
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            This game is unavailable offline
          </Text>
        ) : null}

        <View style={styles.row}>
          {game.priceLabel && game.ownership === 'notOwned' ? (
            <Text variant="titleSmall" style={styles.flex}>
              {game.priceLabel}
            </Text>
          ) : (
            <View style={styles.flex} />
          )}
          <AppButton
            variant={game.installState === 'error' ? 'danger' : 'primary'}
            size="sm"
            disabled={locked}
            onPress={() => onPrimaryAction(game)}
            testID={childTestID(id, 'primary-action')}
          >
            {game.installState === 'error' ? 'Retry' : ACTION_LABEL[game.primaryAction]}
          </AppButton>
        </View>
      </View>
    </AppCard>
  );
};

const styles = StyleSheet.create({
  cover: { width: '100%', overflow: 'hidden' },
  coverFallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  wishlistButton: { position: 'absolute', top: 4, right: 4, margin: 0 },
  platformBadge: { position: 'absolute', bottom: 6, left: 6, paddingHorizontal: 6, paddingVertical: 2 },
  chipRow: { flexDirection: 'row', gap: 4 },
  chip: { height: 26 },
  chipText: { fontSize: 11, marginVertical: 0, lineHeight: 14 },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  flex: { flex: 1 },
});
