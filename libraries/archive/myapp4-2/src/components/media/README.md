# Media & OTT Component Library (React Native Paper)

Domain layer for the streaming loop: discovery rows, hero banners, playback,
episodes and seasons, downloads, watchlists, cast/crew, subscription plans,
and a persistent mini player. Built directly on **React Native Paper 5.x**
primitives per the spec's own component guide — `Card`, `Surface`, `Button`,
`IconButton`, `ProgressBar`, `Menu`, `Chip`, `List.Item`, `SegmentedButtons`,
`Avatar`, `ActivityIndicator`, and `Dialog`/`Portal` via the shared
`AppSheet` — layered on top of the base library in `src/components/`.

## Folder structure

```
src/components/media/
├── theme/mediaTokens.ts      # background/surface/overlay, rarity-free status*, badge*, focus
├── types/domain.ts           # MediaAvailability, ContentPoster, HeroContent, Episode, …
│
├── ContentPosterCard/        + PosterMedia.tsx (loading/loaded/broken artwork)
├── HeroBanner/
├── ContentCarousel/          # generic <T,> rail
├── ContinueWatchingCard/
├── PlayerControlsOverlay/
├── EpisodeListItem/          # built on DownloadStatusButton
├── SeasonSelector/           # SeasonMenu + SeasonSegmentedButtons, one model
├── DownloadStatusButton/
├── WatchlistAndRating/       # WatchlistToggle + MaturityRatingChip
├── CastCrewStrip/
├── SubscriptionPlanCard/
└── MiniPlayerBar/
```

Every folder follows the same three-file shape:
**`Component.tsx`** · **`Component.sample.json`** (dummy data) ·
**`Component.usage.tsx`** (a real, compiling example).

The usage files are not documentation-only — the **Media UI** tab renders
them directly, so an example that drifts from its component fails the
typecheck.

## Reused from the base and other domains

- **`ImageAsset`** (`@ui/primitives/media`) — artwork, backdrops, thumbnails
  and avatars share the exact shape every other domain's media fields use.
- **`AppSheet`** (`@ui/organisms`) — backs `PlayerControlsOverlay`'s audio
  and subtitles picker, the same Portal-based primitive every other domain's
  dialogs and sheets use (the spec asks for Paper's `Dialog`/`Portal`
  directly; `AppSheet` already wraps `Portal` with the same focus/dismiss
  handling).
- **`SkeletonLoader`** / **`StateView`** (`@ui/atoms`, `@ui/molecules`) —
  power `ContentCarousel`'s loading and empty-rail states, and
  `CastCrewStrip`'s loading and no-cast states.
- **`DownloadStatusButton`** is composed inside `EpisodeListItem` — one
  implementation of idempotent download intent, reused wherever a title can
  be downloaded.
- **`react-native-safe-area-context`** — `MiniPlayerBar` docks above the
  device's home indicator using the app's existing `SafeAreaProvider`.

## The one rule

> Continuity with honest state. Users should always know what they can
> watch, where they left off, whether content is included, what is
> downloading, which profile restrictions apply, what playback controls are
> active, and whether a subscription or entitlement change has actually
> completed.

Enforced by construction:

| Component | What it deliberately cannot do |
|---|---|
| `ContentPosterCard` | Treat availability as universal — restricted or region-locked titles stay visible with an honest overlay explaining why. |
| `HeroBanner` | Autoplay sound, or own its own carousel timing — it renders exactly one item and one explicit state. |
| `ContentCarousel` | Know whether its items are movies, episodes, podcasts, or live channels — `renderItem` is fully generic. |
| `ContinueWatchingCard` | Show a progress bar with no text equivalent — "Watched 32 of 48 min" always ships alongside the fraction. |
| `PlayerControlsOverlay` | Own buffering, DRM, or stream selection — it renders `PlayerState` and emits intent to a media-engine adapter. |
| `EpisodeListItem` | Merge Play and Download into one tap target — they are always independently reachable. |
| `SeasonSelector` | Fetch episodes itself — `onChange` only ever emits a season id. |
| `DownloadStatusButton` | Start a transfer on its own — every tap dispatches an intent (`onStart`/`onPause`/…) to a download manager and renders back whatever durable status it reports. |
| `WatchlistToggle` / `MaturityRatingChip` | Signal saved or restricted state with colour alone — both always carry an explicit accessible sentence. |
| `CastCrewStrip` | Render a blank tile for a missing photo — it falls back to initials, and the name/role is always the accessible label. |
| `SubscriptionPlanCard` | Determine trial eligibility, tax, or billing — and it never calls a trial "free" without disclosing when billing begins. |
| `MiniPlayerBar` | Be the only route to playback controls — speed, queue, captions, and sleep timer live one tap away in the full player it opens. |

## Cross-cutting standards

**No hard-coded brand colour.** Every accent in this folder — badges, focus
rings, progress fill, restricted/downloaded states — is a semantic token
from `mediaTokens.ts`. A consumer re-themes the whole domain through
`PaperProvider` without touching a single component file.

**Domain components stay thin.** `PlayerControlsOverlay` never owns
playback; `DownloadStatusButton` never starts a transfer; `SubscriptionPlanCard`
never validates a receipt or checks trial eligibility. Every `*.usage.tsx`
owns the simulated async delay or ticking clock that stands in for these
services.

**Context-aware availability.** `MediaAvailability` (`available` /
`restricted` / `unavailable` / `expired`, with `reason`, `region`, and
`profile`) is threaded through posters, continue-watching items, and
episodes alike — no component in this folder assumes a title is visible to
every profile in every region.

**Reduced motion respected.** Hero and carousel content never forces motion
on the viewer; a paused or manually-advanced state is always available.

## Tokens

`design-tokens/media.tokens.json` — light and dark, semantic names only:
`background`/`surface`/`surfaceVariant`/`overlay`, `focus`, `progressTrack`/
`Value`, `restricted`/`restrictedContainer`, `downloaded`/`downloading`/
`error`, `newBadge`/`fourKBadge`/`liveBadge`.

Read them with `useStreamingTheme()`. No component in this folder accepts a
hex value or a hard-coded brand colour.

## Usage

```tsx
import { ContentPosterCard, ContentCarousel, ContinueWatchingCard } from '@ui/media';

<ContentCarousel
  title="Continue watching"
  items={continueWatchingItems}
  cardWidth={220}
  keyExtractor={(item) => item.id}
  renderItem={({ item }) => <ContinueWatchingCard item={item} onResume={resume} />}
/>
```

See the running app's **Media UI** tab for all twelve, or read any
`*.usage.tsx` for the same examples in source form.
