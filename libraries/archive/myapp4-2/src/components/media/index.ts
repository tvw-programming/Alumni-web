/**
 * MEDIA & OTT COMPONENT LIBRARY (React Native Paper)
 *
 * Domain layer on top of the base library in `src/components/`. Same
 * portability rule as the other domain libraries: nothing here imports from
 * `src/features`, `src/store` or `src/services`. Built directly on React
 * Native Paper 5.x primitives per the spec's own component guide — `Card`,
 * `Surface`, `Button`, `IconButton`, `ProgressBar`, `Dialog`/`Portal` (via
 * the shared `AppSheet`), `Menu`, `Chip`, `List.Item`, `SegmentedButtons`,
 * `Avatar`, `ActivityIndicator`.
 *
 * The organising principle from the spec — continuity with honest state.
 * Users should always know what they can watch, where they left off,
 * whether content is included, what is downloading, which profile
 * restrictions apply, what playback controls are active, and whether a
 * subscription change has actually completed:
 *
 *   - `ContentPosterCard` treats availability as context-aware (profile,
 *     region), never universal — restricted titles stay visible with a reason
 *   - `HeroBanner` renders exactly one item and never autoplays sound;
 *     carousel paging lives in a separate controller
 *   - `ContentCarousel` is fully generic — it never knows whether its
 *     children are movies, episodes, podcasts, or live channels
 *   - `ContinueWatchingCard` always pairs its progress bar with a real text
 *     equivalent ("Watched 32 of 48 min"), never an implied exact percentage
 *   - `PlayerControlsOverlay` renders state and emits intent — it never owns
 *     buffering, DRM, or stream selection
 *   - `EpisodeListItem` keeps Play and Download as separate tap targets
 *   - `SeasonSelector` emits a season id and lets the content layer own
 *     episode fetching
 *   - `DownloadStatusButton` is idempotent — it dispatches intent and
 *     renders durable download-manager state, never starts a transfer itself
 *   - `WatchlistToggle` / `MaturityRatingChip` never use colour as the only
 *     signal for saved or restricted state
 *   - `CastCrewStrip` falls back to initials for a missing headshot, never a
 *     blank tile
 *   - `SubscriptionPlanCard` never determines trial eligibility or billing
 *     itself, and never calls a trial "free" without disclosing when
 *     billing begins
 *   - `MiniPlayerBar` is never the only route to playback controls — speed,
 *     queue, and captions live one tap away in the full player
 */

// Foundations
export * from './theme/mediaTokens';
export * from './types';

// Components
export * from './ContentPosterCard';
export * from './HeroBanner';
export * from './ContentCarousel';
export * from './ContinueWatchingCard';
export * from './PlayerControlsOverlay';
export * from './EpisodeListItem';
export * from './SeasonSelector';
export * from './DownloadStatusButton';
export * from './WatchlistAndRating';
export * from './CastCrewStrip';
export * from './SubscriptionPlanCard';
export * from './MiniPlayerBar';
