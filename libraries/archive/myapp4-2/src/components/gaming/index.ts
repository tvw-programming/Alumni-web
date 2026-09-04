/**
 * GAMING COMPONENT LIBRARY (React Native Paper)
 *
 * Domain layer on top of the base library in `src/components/`. Same
 * portability rule as the other domain libraries: nothing here imports from
 * `src/features`, `src/store` or `src/services`. Built directly on React
 * Native Paper primitives (`Card`, `Surface`, `Chip`, `Badge`, `Avatar`,
 * `ProgressBar`, `ActivityIndicator`, `Dialog`/`Portal` via the shared
 * `AppSheet`, `IconButton`) per the spec's own component guide.
 *
 * The organising principle from the spec — explicit game state. Players
 * should always know what they can do, what they earned, what they own, why
 * an action is blocked, whether a purchase succeeded, how long they must
 * wait, and whether a visual effect represents real server-confirmed
 * progress:
 *
 *   - `GameCard` uses `ProgressBar` for known download percentage and
 *     `ActivityIndicator` only for genuinely indeterminate work
 *   - `Leaderboard` keeps rank, score and movement as plain text — the podium
 *     is decoration layered on top of, never a replacement for, that text
 *   - `PlayerProfileCard` always shows XP as a number next to the bar, and
 *     never implies level is a skill rating
 *   - `AchievementBadge` never leaks a hidden achievement's real title, and
 *     rarity is never the only status cue
 *   - `MatchmakingDialog` renders `state` from an external state machine and
 *     never opens a socket itself
 *   - `ResourcePill` (Lives/Energy/Currency) reads regeneration from a server
 *     timestamp and never grants currency locally
 *   - `RewardClaimDialog` treats every claim as pending until the backend
 *     confirms it — never optimistic-grants on the client's word
 *   - `DailyStreakCalendar` marks a missed day as a fact, never with
 *     shame-based copy, and keeps historical progress after a reset
 *   - `InAppPurchaseCard` never shows a successful entitlement before
 *     server-side receipt validation
 *   - `GameControlsOverlay` gives every icon button a real accessibility
 *     label and keeps pause/save/exit rules outside the overlay
 *   - `CountdownTimer` computes remaining time from a server-anchored
 *     timestamp every tick, never a drifting local interval
 *   - `TournamentCard` states eligibility and prize cost before the join
 *     action is ever enabled
 *   - `SpinWheelWidget` only visualizes a result the server already chose —
 *     the wheel never determines its own outcome
 */

// Foundations
export * from './theme/gamingTokens';
export * from './types';

// Components
export * from './GameCard';
export * from './Leaderboard';
export * from './PlayerProfileCard';
export * from './Achievement';
export * from './MatchmakingDialog';
export * from './ResourcePill';
export * from './DailyReward';
export * from './InAppPurchaseCard';
export * from './GameControlsOverlay';
export * from './ScoreAndTimer';
export * from './TournamentCard';
export * from './SpinWheelWidget';
