import React from "react";
import { StyleSheet, View } from "react-native";
import {
  Avatar,
  Icon,
  ProgressBar,
  Text,
  TouchableRipple,
} from "react-native-paper";

import { AppButton } from "@ui/atoms/AppButton";
import { AppCard } from "@ui/molecules/AppCard";
import { useAppTheme } from "@/theme";
import { childTestID, initialsOf } from "@/utils";
import type { StyleEscapeHatches } from "@ui/primitives";

import { useGameTheme } from "../theme/gamingTokens";
import type {
  PlayerProfile,
  PresenceStatus,
  RelationshipStatus,
} from "../types/domain";

const PRESENCE_META: Record<
  PresenceStatus,
  {
    label: string;
    colorKey: "success" | "warning" | "statusError" | "statusLocked";
  }
> = {
  online: { label: "Online", colorKey: "success" },
  away: { label: "Away", colorKey: "warning" },
  busy: { label: "Busy", colorKey: "statusError" },
  offline: { label: "Offline", colorKey: "statusLocked" },
};

const RELATIONSHIP_LABEL: Record<RelationshipStatus, string> = {
  none: "Add friend",
  friend: "Friends",
  pending: "Request pending",
  blocked: "Blocked",
};

export interface PlayerProfileCardProps extends StyleEscapeHatches {
  player: PlayerProfile;
  variant?: "compact" | "standard" | "featured";
  onPress?: (player: PlayerProfile) => void;
  onRelationshipAction?: (player: PlayerProfile) => void;
}

/**
 * XP always renders as a number alongside the progress bar — "2,400 / 3,000
 * XP", never a bare fill. Level is presented as level, never implied to be a
 * skill rating unless the caller's copy says so explicitly.
 */
export const PlayerProfileCard = ({
  player,
  variant = "standard",
  onPress,
  onRelationshipAction,
  style,
  containerStyle,
  testID,
}: PlayerProfileCardProps) => {
  const theme = useAppTheme();
  const gaming = useGameTheme();
  const id = testID ?? `player-profile-${player.id}`;

  if (player.hiddenProfile) {
    return (
      <AppCard
        variant="outlined"
        containerStyle={containerStyle}
        style={style}
        testID={id}
      >
        <View style={styles.row}>
          <Icon
            source="account-lock-outline"
            size={20}
            color={theme.colors.onSurfaceVariant}
          />
          <Text
            variant="bodyMedium"
            style={{ color: theme.colors.onSurfaceVariant, marginLeft: 8 }}
          >
            This profile is private
          </Text>
        </View>
      </AppCard>
    );
  }

  const presence = player.presence ? PRESENCE_META[player.presence] : undefined;
  const xpRatio =
    player.currentXp != null && player.nextLevelXp
      ? Math.min(1, player.currentXp / player.nextLevelXp)
      : undefined;
  const avatarSize =
    variant === "featured"
      ? gaming.layout.avatarSize + 16
      : gaming.layout.avatarSize;

  const a11yLabel = `${player.displayName}${player.level != null ? `, level ${player.level}` : ""}${presence ? `, ${presence.label}` : ""}${
    player.currentGame ? `, playing ${player.currentGame}` : ""
  }`;

  const content = (
    <View
      style={variant === "compact" ? styles.row : { gap: theme.spacing.sm }}
    >
      <View style={styles.row}>
        <View>
          {player.avatar?.uri ? (
            <Avatar.Image
              size={avatarSize}
              source={{ uri: player.avatar.uri }}
            />
          ) : (
            <Avatar.Text
              size={avatarSize}
              label={initialsOf(player.displayName)}
            />
          )}
          {presence ? (
            <View
              style={[
                styles.presenceDot,
                {
                  backgroundColor: gaming.colors[presence.colorKey],
                  borderColor: theme.colors.surface,
                },
              ]}
              accessibilityElementsHidden
            />
          ) : null}
        </View>

        <View style={[styles.flex, { marginLeft: theme.spacing.sm }]}>
          <Text
            variant={variant === "featured" ? "titleMedium" : "titleSmall"}
            numberOfLines={1}
          >
            {player.displayName}
          </Text>
          {player.level != null ? (
            <Text
              variant="labelSmall"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              Level {player.level}
              {player.gamerScore != null
                ? ` · ${player.gamerScore} GamerScore`
                : ""}
            </Text>
          ) : null}
          {presence ? (
            <Text
              variant="labelSmall"
              style={{ color: gaming.colors[presence.colorKey] }}
            >
              {presence.label}
              {player.currentGame ? ` · Playing ${player.currentGame}` : ""}
            </Text>
          ) : player.lastActiveLabel ? (
            <Text
              variant="labelSmall"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              Last active {player.lastActiveLabel}
            </Text>
          ) : null}
        </View>
      </View>

      {variant !== "compact" && xpRatio != null ? (
        <View style={{ gap: 2 }}>
          <ProgressBar
            progress={xpRatio}
            color={theme.colors.primary}
            style={{
              height: 6,
              borderRadius: theme.radii.pill,
              backgroundColor: gaming.colors.progressTrack,
            }}
            accessibilityLabel={`${player.currentXp} of ${player.nextLevelXp} XP to next level`}
          />
          <Text
            variant="labelSmall"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            {player.currentXp?.toLocaleString()} /{" "}
            {player.nextLevelXp?.toLocaleString()} XP
          </Text>
        </View>
      ) : null}

      {variant !== "compact" && onRelationshipAction ? (
        <AppButton
          variant={
            player.relationship === "friend"
              ? "secondary"
              : player.relationship === "blocked"
                ? "ghost"
                : "primary"
          }
          size="sm"
          disabled={
            player.relationship === "blocked" ||
            player.relationship === "pending"
          }
          onPress={() => onRelationshipAction(player)}
          testID={childTestID(id, "relationship")}
        >
          {RELATIONSHIP_LABEL[player.relationship ?? "none"]}
        </AppButton>
      ) : null}
    </View>
  );

  return (
    <AppCard
      variant="outlined"
      containerStyle={containerStyle}
      style={style}
      testID={id}
    >
      {onPress ? (
        <TouchableRipple
          onPress={() => onPress(player)}
          accessibilityRole="button"
          accessibilityLabel={a11yLabel}
        >
          {content}
        </TouchableRipple>
      ) : (
        <View accessibilityRole="text" accessibilityLabel={a11yLabel}>
          {content}
        </View>
      )}
    </AppCard>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  flex: { flex: 1 },
  presenceDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
});
