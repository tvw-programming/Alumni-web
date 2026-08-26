# Gaming Component Library (React Native Paper)

Domain layer for the game/store/social loop: library cards, leaderboards,
player profiles, achievements, matchmaking, lives/energy/currency, daily
rewards, in-app purchases, in-game controls, score/timer HUD elements,
tournaments, and spin-to-win rewards. Built directly on **React Native
Paper** primitives per the spec's own component guide — `Card`, `Surface`,
`Chip`, `Badge`, `Avatar`, `ProgressBar`, `ActivityIndicator`, `IconButton`,
and `Dialog`/`Portal` via the shared `AppSheet` — layered on top of the base
library in `src/components/`.

## Folder structure

```
src/components/gaming/
├── theme/gamingTokens.ts     # surfaceGame/Overlay, status*, rarity*, currency*, focusRing
├── types/domain.ts           # GameCardData, LeaderboardEntry, Achievement, Tournament, …
│
├── GameCard/
├── Leaderboard/              # LeaderboardRow + LeaderboardPodium + composite
├── PlayerProfileCard/
├── Achievement/              # AchievementBadge + AchievementGrid
├── MatchmakingDialog/
├── ResourcePill/             # LivesEnergyBar + CurrencyPill, one data model
├── DailyReward/              # RewardClaimDialog + DailyStreakCalendar
├── InAppPurchaseCard/
├── GameControlsOverlay/
├── ScoreAndTimer/            # ScoreCounter + CountdownTimer
├── TournamentCard/           # built on CountdownTimer
└── SpinWheelWidget/
```

Every folder follows the same three-file shape:
**`Component.tsx`** · **`Component.sample.json`** (dummy data) ·
**`Component.usage.tsx`** (a real, compiling example).

The usage files are not documentation-only — the **Gaming UI** tab renders
them directly, so an example that drifts from its component fails the
typecheck.

## Reused from the base and other domains

- **`ImageAsset`** (`@ui/primitives/media`) — cover art, avatars, and reward
  icons share the exact shape every other domain's media fields already use.
- **`AppSheet`** (`@ui/organisms`) — backs `MatchmakingDialog`,
  `RewardClaimDialog`, and `InAppPurchaseCard`'s purchase confirmation, the
  same Portal-based primitive every other domain's dialogs and sheets use
  (the spec asks for Paper's `Dialog`/`Portal` directly; `AppSheet` already
  wraps `Portal` with the same focus and dismiss handling).
- **`FilterChipGroup`** (`@ui/molecules`) — powers `AchievementGrid`'s
  status filter (All/Earned/In progress/Locked).
- **`ConfirmProvider`** (`@ui/providers`) — `GameControlsOverlay`'s usage
  example routes "Exit" and "Restart" through the same confirm-before-losing-
  progress pattern used elsewhere in the app, rather than a bespoke dialog.
- **`CountdownTimer`** is composed inside `TournamentCard` for its
  starts-in/registration-closes countdown — one implementation, two contexts.

## The one rule

> Explicit game state. Players should always know what they can do, what they
> earned, what they own, why an action is blocked, whether a purchase
> succeeded, how long they must wait, and whether a visual or animated effect
> represents real server-confirmed progress.

Enforced by construction:

| Component | What it deliberately cannot do |
|---|---|
| `GameCard` | Use `ActivityIndicator` for a known download percentage — that's always a real `ProgressBar` value. |
| `Leaderboard` / `Podium` | Encode rank in height or a medal alone. Every row is plain, screen-reader-readable text underneath the podium visual. |
| `PlayerProfileCard` | Show an XP bar with no number, or imply level is a skill rating. |
| `AchievementBadge` | Leak a hidden achievement's real title or description before it's earned, or use rarity colour as the only status cue. |
| `MatchmakingDialog` | Open a matchmaking socket itself — it only ever renders a `MatchmakingState` value. |
| `ResourcePill` | Grant currency or determine purchase success locally, or count down from anything but a server `regenerateAt` timestamp. |
| `RewardClaimDialog` | Show `claimed` before the backend actually confirms the claim — a retried or double-tapped claim can't grant twice on the client's word. |
| `DailyStreakCalendar` | Use shame-based copy for a missed day, or silently erase the historical streak on reset. |
| `InAppPurchaseCard` | Show a successful entitlement before server-side receipt validation, or calculate "savings" itself — that's supplied by the commerce service. |
| `GameControlsOverlay` | Render an icon-only control with no `accessibilityLabel`, or decide pause/save/exit rules itself. |
| `CountdownTimer` | Count down from a local interval that can drift — remaining time is recomputed from `endsAt` every tick. |
| `TournamentCard` | Enable "Join" before eligibility and entry cost are already visible on the card. |
| `SpinWheelWidget` | Pick its own winner — it only visualizes a `resultReward` the server already selected. |

## Cross-cutting standards

**Never colour alone.** Rarity, leaderboard movement, achievement status, and
resource-exhausted states all pair an icon and a word with any colour.

**Reduced motion has a real alternative, not just "less."** `ScoreCounter`
and `SpinWheelWidget` both skip their animation entirely under
`useMotion({ animated: false })` and show the end state immediately —
motion is never the only way information arrives.

**Domain components stay thin.** `MatchmakingDialog` renders
`state: "searching"` but never opens a socket; `InAppPurchaseCard` renders
`purchaseStatus: "pending"` but never validates a receipt; `SpinWheelWidget`
spins to a `resultReward` it was handed, never one it picked. Every
`*.usage.tsx` owns the simulated async delay that stands in for these
services.

**Haptics and motion are always optional.** No component in this folder
triggers haptic feedback directly — the spec reserves that for spin-start,
rare-tier landings, and reward claims, gated behind user settings the
consuming app controls.

## Tokens

`design-tokens/gaming.tokens.json` — light and dark, semantic names only:
`surfaceGame`/`Overlay`/`Selected`, `status*` (Locked/Earned/InProgress/
Hidden/Error), `rarity*` (Common/Rare/Epic/Legendary), `currency*`
(Coins/Gems/Tokens), `livesFull`/`energyFull`, `progressTrack`, `success`/
`warning`/`critical`, `focusRing`.

Read them with `useGameTheme()`. No component in this folder accepts a hex
value.

## Usage

```tsx
import { GameCard, Leaderboard, AchievementGrid } from '@ui/gaming';

<GameCard
  game={game}
  onPrimaryAction={(item) => install(item)}   // caller owns install/purchase orchestration
  onWishlist={(item, next) => toggleWishlist(item.id, next)}
/>
```

See the running app's **Gaming UI** tab for all twelve, or read any
`*.usage.tsx` for the same examples in source form.
