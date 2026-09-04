import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Avatar, Icon, Text, TouchableRipple } from 'react-native-paper';

import { AppCard } from '@ui/molecules/AppCard';
import { useAppTheme } from '@/theme';
import { childTestID, initialsOf } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useServiceTheme } from '../theme/ondemandTokens';
import type { LiveTrackingData, TrackingStatus } from '../types/domain';

const STATUS_COPY: Record<TrackingStatus, { label: string; icon: string; colorKey: 'trackLive' | 'trackStale' | 'trackEnded' }> = {
  pending: { label: 'Waiting for location', icon: 'map-marker-outline', colorKey: 'trackStale' },
  live: { label: 'Live', icon: 'map-marker-radius', colorKey: 'trackLive' },
  stale: { label: 'Location delayed', icon: 'map-marker-alert-outline', colorKey: 'trackStale' },
  ended: { label: 'Tracking ended', icon: 'map-marker-off-outline', colorKey: 'trackEnded' },
  unavailable: { label: 'Location unavailable', icon: 'map-marker-off', colorKey: 'trackEnded' },
};

export interface LiveTrackingCardProps extends StyleEscapeHatches {
  data: LiveTrackingData;
  onCall?: () => void;
  onChat?: () => void;
  onOpenFullMap?: () => void;
}

/**
 * The map snippet is decoration, not the message — every state has a mandatory
 * textual alternative ("Your provider is 4 minutes away") so tracking is usable
 * without pixel-reading a pin. Call/chat route through a masked relay copy
 * ("via app") so no personal phone number appears in the UI.
 *
 * Once `trackingStatus` is 'ended' we deliberately stop rendering location
 * details — no origin/destination/provider pin survives service completion.
 */
export const LiveTrackingCard = ({ data, onCall, onChat, onOpenFullMap, style, containerStyle, testID }: LiveTrackingCardProps) => {
  const theme = useAppTheme();
  const service = useServiceTheme();
  const id = testID ?? 'live-tracking-card';
  const statusCopy = STATUS_COPY[data.trackingStatus];
  const ended = data.trackingStatus === 'ended' || data.trackingStatus === 'unavailable';

  const summaryText = useMemo(() => {
    if (ended) return 'This trip has ended. Live location is no longer shared.';
    if (data.trackingStatus === 'pending') return "We'll show live tracking as soon as your provider starts moving.";
    if (data.trackingStatus === 'stale') return `Last known: ${data.distanceLabel ?? 'nearby'}${data.lastUpdatedAt ? ` · updated ${data.lastUpdatedAt}` : ''}`;
    const who = data.provider?.name ? `${data.provider.name} is` : 'Your provider is';
    return data.etaLabel ? `${who} ${data.etaLabel} away` : data.distanceLabel ? `${who} ${data.distanceLabel} away` : `${who} on the way`;
  }, [data, ended]);

  return (
    <AppCard variant="outlined" containerStyle={containerStyle} style={style} testID={id}>
      <View style={{ gap: theme.spacing.sm }}>
        <View style={styles.row}>
          <Text variant="titleMedium" accessibilityRole="header" style={styles.flex}>
            {ended ? 'Trip summary' : 'Live tracking'}
          </Text>
          <View style={[styles.row, { gap: 4 }]}>
            <Icon source={statusCopy.icon} size={14} color={service.colors[statusCopy.colorKey]} />
            <Text variant="labelSmall" style={{ color: service.colors[statusCopy.colorKey] }}>
              {statusCopy.label}
            </Text>
          </View>
        </View>

        {!ended ? (
          <TouchableRipple
            onPress={onOpenFullMap}
            disabled={!onOpenFullMap}
            accessibilityRole={onOpenFullMap ? 'button' : undefined}
            accessibilityLabel={onOpenFullMap ? 'Open full map' : undefined}
            style={[styles.mapPreview, { height: service.layout.mapPreviewHeight, backgroundColor: service.colors.surfaceMap, borderRadius: theme.radii.md }]}
            testID={childTestID(id, 'map')}
          >
            <View style={styles.mapContent}>
              <Icon source={data.trackingStatus === 'live' ? 'navigation-variant' : 'map-marker-off-outline'} size={28} color={theme.colors.onSurfaceVariant} />
            </View>
          </TouchableRipple>
        ) : null}

        {/* Mandatory textual alternative to the map — never map-only */}
        <Text variant="bodyMedium" accessibilityLiveRegion={data.trackingStatus === 'live' ? 'polite' : 'none'} testID={childTestID(id, 'summary')}>
          {summaryText}
        </Text>

        {data.routeChangedNote ? (
          <View style={[styles.notice, { backgroundColor: theme.colors.errorContainer, borderRadius: theme.radii.sm, padding: theme.spacing.xs }]} accessibilityLiveRegion="assertive">
            <Icon source="routes" size={13} color={theme.colors.onErrorContainer} />
            <Text variant="labelSmall" style={{ color: theme.colors.onErrorContainer, marginLeft: 6, flex: 1 }}>
              {data.routeChangedNote}
            </Text>
          </View>
        ) : null}

        {data.provider && !ended ? (
          <View style={[styles.row, { gap: theme.spacing.sm, marginTop: theme.spacing.xs }]}>
            {data.provider.avatar?.uri ? (
              <Avatar.Image size={36} source={{ uri: data.provider.avatar.uri }} />
            ) : (
              <Avatar.Text size={36} label={initialsOf(data.provider.name)} />
            )}
            <Text variant="bodyMedium" style={styles.flex}>
              {data.provider.name}
            </Text>
            {onChat ? (
              <TouchableRipple
                onPress={onChat}
                accessibilityRole="button"
                accessibilityLabel="Chat with provider, via app"
                style={styles.iconButton}
                testID={childTestID(id, 'chat')}
              >
                <Icon source="chat-outline" size={20} color={theme.colors.primary} />
              </TouchableRipple>
            ) : null}
            {onCall ? (
              <TouchableRipple
                onPress={onCall}
                accessibilityRole="button"
                accessibilityLabel="Call provider, number is masked"
                style={styles.iconButton}
                testID={childTestID(id, 'call')}
              >
                <Icon source="phone-outline" size={20} color={theme.colors.primary} />
              </TouchableRipple>
            ) : null}
          </View>
        ) : null}

        {!ended ? (
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            Calls and chats are relayed through the app — your number stays private.
          </Text>
        ) : null}
      </View>
    </AppCard>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  mapPreview: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  mapContent: { alignItems: 'center', justifyContent: 'center' },
  notice: { flexDirection: 'row', alignItems: 'center' },
  iconButton: { padding: 8, borderRadius: 20 },
});
