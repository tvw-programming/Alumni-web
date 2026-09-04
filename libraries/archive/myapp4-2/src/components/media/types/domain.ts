import type { ImageAsset } from '@ui/primitives/media';

/** Context-aware availability — a title is never universally visible. */
export interface MediaAvailability {
  status: 'available' | 'restricted' | 'unavailable' | 'expired';
  reason?: string;
  region?: string;
  profile?: string;
}

// ---------------------------------------------------------------------------
// 1. ContentPosterCard
// ---------------------------------------------------------------------------

export type PosterAspectRatio = 'portrait' | 'landscape';
export type WatchlistState = 'notSaved' | 'saved' | 'loading';

export interface ContentPoster {
  id: string;
  title: string;
  image?: ImageAsset;
  aspectRatio?: PosterAspectRatio;
  metadata?: string;
  badges?: string[];
  maturityRating?: string;
  watchlistState?: WatchlistState;
  availability?: MediaAvailability;
}

// ---------------------------------------------------------------------------
// 2. HeroBanner
// ---------------------------------------------------------------------------

export type HeroPrimaryAction = 'play' | 'resume' | 'watchTrailer' | 'subscribe';

export interface HeroContent {
  id: string;
  title: string;
  backdrop?: ImageAsset;
  description?: string;
  metadata?: string;
  maturityRating?: string;
  badges?: string[];
}

// ---------------------------------------------------------------------------
// 4. ContinueWatchingCard
// ---------------------------------------------------------------------------

export interface ContinueWatchingItem {
  id: string;
  title: string;
  subtitle?: string;
  image?: ImageAsset;
  progress: number;
  durationLabel?: string;
  progressLabel?: string;
  availability?: MediaAvailability;
}

// ---------------------------------------------------------------------------
// 5. PlayerControlsOverlay
// ---------------------------------------------------------------------------

export type CastState = 'unavailable' | 'available' | 'connecting' | 'connected';

export interface PlayerState {
  isPlaying: boolean;
  positionMs: number;
  durationMs: number;
  bufferedMs?: number;
  buffering?: boolean;
  qualityOptions?: string[];
  selectedQuality?: string;
  subtitleOptions?: string[];
  selectedSubtitle?: string;
  audioOptions?: string[];
  selectedAudio?: string;
  speedOptions?: number[];
  selectedSpeed?: number;
  castState?: CastState;
  nextEpisodeLabel?: string;
  errorMessage?: string;
}

// ---------------------------------------------------------------------------
// 6. EpisodeListItem
// ---------------------------------------------------------------------------

export type DownloadStatus = 'idle' | 'queued' | 'downloading' | 'paused' | 'done' | 'error' | 'expired' | 'unavailable';

export interface Episode {
  id: string;
  episodeNumber: number;
  title: string;
  thumbnail?: ImageAsset;
  durationLabel: string;
  description?: string;
  progress?: number;
  downloadState?: DownloadStatus;
  downloadProgress?: number;
  availability?: MediaAvailability;
  isSeasonFinale?: boolean;
}

// ---------------------------------------------------------------------------
// 7. SeasonSelector
// ---------------------------------------------------------------------------

export interface Season {
  id: string;
  label: string;
  episodeCount?: number;
  badge?: string;
  disabled?: boolean;
}

// ---------------------------------------------------------------------------
// 9. WatchlistToggle / MaturityRatingChip — see WatchlistState above

// ---------------------------------------------------------------------------
// 10. CastCrewStrip
// ---------------------------------------------------------------------------

export type CastCrewType = 'cast' | 'crew' | 'creator';

export interface CastCrewPerson {
  id: string;
  name: string;
  role: string;
  character?: string;
  avatar?: ImageAsset;
  type: CastCrewType;
}

// ---------------------------------------------------------------------------
// 11. SubscriptionPlanCard
// ---------------------------------------------------------------------------

export interface PlanFeature {
  id: string;
  label: string;
  included: boolean;
  detail?: string;
}

export type PlanAvailability = 'available' | 'unavailable' | 'loading';

export interface SubscriptionPlan {
  id: string;
  name: string;
  priceLabel: string;
  billingLabel: string;
  features: PlanFeature[];
  badge?: string;
  current?: boolean;
  recommended?: boolean;
  availability: PlanAvailability;
  trialLabel?: string;
}

// ---------------------------------------------------------------------------
// 12. MiniPlayerBar
// ---------------------------------------------------------------------------

export type MiniPlayerStatus = 'playing' | 'paused' | 'buffering' | 'error' | 'offline';

export interface MiniPlayerItem {
  id: string;
  title: string;
  subtitle?: string;
  artwork?: ImageAsset;
}
