import type { ImageAsset } from '@ui/primitives/media';

// ---------------------------------------------------------------------------
// 1. GameCard
// ---------------------------------------------------------------------------

export type GameOwnership = 'owned' | 'notOwned' | 'subscription' | 'locked';
export type GameInstallState = 'notInstalled' | 'installing' | 'installed' | 'updating' | 'paused' | 'error';
export type GamePrimaryAction = 'play' | 'install' | 'buy' | 'resume' | 'update';

export interface GameCardData {
  id: string;
  title: string;
  cover?: ImageAsset;
  genres?: string[];
  platform?: string;
  downloadSizeLabel?: string;
  ownership: GameOwnership;
  installState: GameInstallState;
  progress?: number;
  priceLabel?: string;
  primaryAction: GamePrimaryAction;
  wishlisted?: boolean;
  errorMessage?: string;
  offlinePlayable?: boolean;
  parentalRestriction?: boolean;
}

// ---------------------------------------------------------------------------
// 2. LeaderboardRow / LeaderboardPodium
// ---------------------------------------------------------------------------

export type LeaderboardMovement = 'up' | 'down' | 'same';
export type LeaderboardEntryStatus = 'active' | 'unranked' | 'hidden' | 'underReview';
export type LeaderboardScope = 'global' | 'friends' | 'clan' | 'season';

export interface LeaderboardEntry {
  playerId: string;
  displayName: string;
  avatar?: ImageAsset;
  rank: number;
  score: number;
  scoreLabel: string;
  movement?: LeaderboardMovement;
  isCurrentPlayer?: boolean;
  status?: LeaderboardEntryStatus;
  clanTag?: string;
}

// ---------------------------------------------------------------------------
// 3. PlayerProfileCard
// ---------------------------------------------------------------------------

export type PresenceStatus = 'online' | 'away' | 'busy' | 'offline';
export type RelationshipStatus = 'none' | 'friend' | 'pending' | 'blocked';

export interface PlayerProfile {
  id: string;
  displayName: string;
  avatar?: ImageAsset;
  level?: number;
  currentXp?: number;
  nextLevelXp?: number;
  gamerScore?: number;
  presence?: PresenceStatus;
  currentGame?: string;
  relationship?: RelationshipStatus;
  hiddenProfile?: boolean;
  lastActiveLabel?: string;
}

// ---------------------------------------------------------------------------
// 4. AchievementBadge / AchievementGrid
// ---------------------------------------------------------------------------

export type AchievementStatus = 'locked' | 'earned' | 'hidden' | 'inProgress';
export type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface Achievement {
  id: string;
  title: string;
  description?: string;
  icon?: ImageAsset;
  status: AchievementStatus;
  progress?: number;
  progressLabel?: string;
  rarity?: AchievementRarity;
  earnedAt?: string;
  gameTitle?: string;
}

// ---------------------------------------------------------------------------
// 5. MatchmakingDialog
// ---------------------------------------------------------------------------

export type MatchmakingState =
  | 'idle'
  | 'queueing'
  | 'searching'
  | 'matchFound'
  | 'starting'
  | 'canceling'
  | 'canceled'
  | 'timeout'
  | 'error';

export interface MatchmakingModel {
  state: MatchmakingState;
  mode: string;
  partySize: number;
  elapsedSeconds: number;
  estimatedWait?: string;
  region?: string;
  cancellationPenaltyNote?: string;
}

// ---------------------------------------------------------------------------
// 6. LivesEnergyBar / CurrencyPill
// ---------------------------------------------------------------------------

export type ResourceType = 'lives' | 'energy' | 'coins' | 'gems' | 'tokens';
export type ResourceStatus = 'available' | 'exhausted' | 'loading' | 'syncing' | 'error';

export interface Resource {
  type: ResourceType;
  current: number;
  maximum?: number;
  regenerateAt?: string;
  status: ResourceStatus;
}

// ---------------------------------------------------------------------------
// 7. RewardClaimDialog / DailyStreakCalendar
// ---------------------------------------------------------------------------

export type RewardDayStatus = 'locked' | 'available' | 'claimed' | 'missed' | 'protected';

export interface RewardContents {
  label: string;
  icon?: ImageAsset;
  quantity: number;
}

export interface RewardDay {
  day: number;
  reward: RewardContents;
  status: RewardDayStatus;
}

export type RewardClaimStatus = 'available' | 'claiming' | 'claimed' | 'alreadyClaimed' | 'error';

// ---------------------------------------------------------------------------
// 8. InAppPurchaseCard
// ---------------------------------------------------------------------------

export type PurchaseType = 'consumable' | 'nonConsumable' | 'subscription';
export type PurchaseAvailability = 'available' | 'owned' | 'unavailable' | 'loading';

export interface PurchaseItem {
  id: string;
  label: string;
  quantity: number;
  icon?: ImageAsset;
}

export interface PurchaseBundle {
  id: string;
  title: string;
  items: PurchaseItem[];
  priceLabel: string;
  originalValueLabel?: string;
  savingsLabel?: string;
  purchaseType: PurchaseType;
  availability: PurchaseAvailability;
  expiresAt?: string;
  limitedTime?: boolean;
}

export type PurchaseFlowStatus = 'idle' | 'confirming' | 'pending' | 'success' | 'failed';

// ---------------------------------------------------------------------------
// 9. GameControlsOverlay
// ---------------------------------------------------------------------------

export type GameControlType = 'pause' | 'sound' | 'settings' | 'captions' | 'exit' | 'restart';

export interface GameControl {
  id: string;
  type: GameControlType;
  enabled: boolean;
  active?: boolean;
  label: string;
}

// ---------------------------------------------------------------------------
// 10. ScoreCounter / CountdownTimer
// ---------------------------------------------------------------------------

export type TimerStatus = 'running' | 'paused' | 'warning' | 'critical' | 'expired';

// ---------------------------------------------------------------------------
// 11. TournamentCard
// ---------------------------------------------------------------------------

export type TournamentStatus = 'upcoming' | 'registrationOpen' | 'inProgress' | 'ended' | 'canceled';
export type TournamentUserStatus = 'eligible' | 'registered' | 'ineligible' | 'waitlisted';

export interface Tournament {
  id: string;
  title: string;
  mode: string;
  startsAt: string;
  endsAt?: string;
  status: TournamentStatus;
  entryRequirement?: string;
  prizeLabel?: string;
  participantCount?: number;
  maxParticipants?: number;
  userStatus?: TournamentUserStatus;
  currentRoundLabel?: string;
}

// ---------------------------------------------------------------------------
// 12. SpinWheelWidget
// ---------------------------------------------------------------------------

export type SpinWheelState = 'ready' | 'spinning' | 'result' | 'claiming' | 'claimed' | 'error' | 'insufficientCurrency';

export interface SpinReward {
  id: string;
  label: string;
  icon?: ImageAsset;
  rarity?: AchievementRarity;
  quantity: number;
  odds?: number;
}
