# Fitness & Wellness Component Library (React Native Paper)

Domain layer for workouts, nutrition, activity rings, sleep, habits, and
meditation. Built directly on **React Native Paper** primitives per the
spec's own component guide — `Card`, `Surface`, `Chip`, `ProgressBar`,
`Checkbox`, `List.Item`/`List.Accordion`, `Menu`, `SegmentedButtons`,
`ActivityIndicator`, and `Dialog`/`Portal` via the shared `AppSheet` —
layered on top of the base library in `src/components/`.

## Folder structure

```
src/components/fitness/
├── theme/fitnessTokens.ts    # background/surface, ring*, macro*, streak*, sleep*
├── types/domain.ts           # WorkoutCardData, ExerciseItem, ActivityRing, Meal, …
├── primitives/RingProgress.tsx  # shared SVG ring renderer (Paper has no circular-progress primitive)
│
├── WorkoutCard/
├── ExerciseListItem/
├── RestTimerCircle/          # built on RingProgress
├── ActivityRings/            # + StepCounterRing, both built on RingProgress
├── WaterIntakeTracker/
├── MealCard/                 # + MacroBreakdownBar
├── WeightLogChart/           # + LogEntrySheet
├── HabitCheckRow/
├── SleepSummaryCard/
├── WorkoutPlanTimeline/
├── PersonalRecordAndStreak/  # PersonalRecordCard + StreakFlame
└── MeditationPlayerCard/
```

Every folder follows the same three-file shape:
**`Component.tsx`** · **`Component.sample.json`** (dummy data) ·
**`Component.usage.tsx`** (a real, compiling example).

The usage files are not documentation-only — the **Fitness UI** tab renders
them directly, so an example that drifts from its component fails the
typecheck.

## Reused from the base and other domains

- **`ImageAsset`** (`@ui/primitives/media`) — workout covers, exercise
  thumbnails, and meditation artwork share the exact shape every other
  domain's media fields use.
- **`AppSheet`** (`@ui/organisms`) — backs `WaterIntakeTracker`'s custom
  amount entry and `LogEntrySheet`, the same Portal-based primitive every
  other domain's dialogs and sheets use.
- **`RingProgress`** (`src/components/fitness/primitives`) — one SVG ring
  renderer shared by `RestTimerCircle` (single ring) and
  `ActivityRings`/`StepCounterRing` (single or concentric rings), since
  React Native Paper has no dedicated circular-progress primitive.
- **`StateView`** / **`SkeletonLoader`** (`@ui/molecules`, `@ui/atoms`) —
  power `WeightLogChart`'s empty state and loading states elsewhere.

## The one rule

> Supportive clarity. Users should understand what they logged, where they
> stand relative to a goal, whether data is synced or stale, what action
> comes next, and how the system behaves when a habit, workout, timer,
> sensor, or playback session is interrupted.

Enforced by construction:

| Component | What it deliberately cannot do |
|---|---|
| `WorkoutCard` | Present a calorie figure as a guaranteed burn — it's always labelled "Estimated." |
| `ExerciseListItem` | Make an animated thumbnail the only source of instruction — sets/reps/weight are always rendered as text. |
| `RestTimerCircle` | Let the ring or colour outrank the number — the countdown is always the primary signal, and urgency only shows in the final seconds. |
| `ActivityRings` / `StepCounterRing` | Render without a text equivalent, or represent unrelated metrics — reserved for a small set of related personal goals with an explicit owner. |
| `WaterIntakeTracker` | Double-count a rapid tap — each tap is one `onAdd` intent, reconciled by the intake service. |
| `MealCard` / `MacroBreakdownBar` | Calculate calories from macros or vice versa — both are rendered exactly as supplied by the nutrition service. |
| `WeightLogChart` | Use value-judgement language ("good"/"bad") — trend copy stays neutral, and every plotted point is also a listed, exact value. |
| `HabitCheckRow` | Use shame-based copy for a missed day, or erase the streak's historical record on a reset. |
| `SleepSummaryCard` | Present a sleep score as a medical diagnosis, or use alert red for a low score. |
| `WorkoutPlanTimeline` | Leave the collapsed accordion row uninformative — title, duration, and state are visible before any day is expanded. |
| `PersonalRecordCard` / `StreakFlame` | Detect records or compute streak rules itself — both render server-confirmed state, and a broken streak keeps its longest-streak history visible. |
| `MeditationPlayerCard` | Assume every session type (guided, Sleep Story, soundscape, music, breathing) supports identical timer or autoplay behaviour. |

## Cross-cutting standards

**Never colour alone.** Ring status, macro bars, sleep stages, streak state,
and habit-day state all pair an icon or text label with any colour.

**Health data carries its source.** `HealthDataMeta` (`source`,
`measuredAt`, `freshness`) is threaded through weight entries so imported,
manual, and wearable-synced data are never presented identically.

**Domain components stay thin.** `RestTimerCircle` never determines workout
progression; `MealCard` never independently calculates calories;
`PersonalRecordCard` never detects records itself. Every `*.usage.tsx` owns
the simulated async delay or ticking clock that stands in for these
services.

**Reduced motion has a real alternative.** `RingProgress` accepts
`animated={false}` and jumps straight to the end state — a ring, timer, or
streak flame is never information-only-through-animation.

## Tokens

`design-tokens/fitness.tokens.json` — light and dark, semantic names only:
`background`/`surface`/`surfaceVariant`, `primary`/`secondary`/`accent`,
`ringMove`/`Exercise`/`Stand`/`Track`, `macroProtein`/`Carbs`/`Fat`,
`streakActive`/`Broken`/`Protected`, `restCalm`/`Urgent`, `sleepDeep`/
`Light`/`Rem`/`Awake`.

Read them with `useWellnessTheme()`. No component in this folder reuses any
platform's exact ring or brand colour identity.

## Usage

```tsx
import { WorkoutCard, ExerciseListItem, RestTimerCircle } from '@ui/fitness';

<WorkoutCard
  workout={workout}
  onPress={(item) => openDetail(item)}
  onPrimaryAction={(item) => startWorkout(item)}   // caller owns session state
/>
```

See the running app's **Fitness UI** tab for all twelve, or read any
`*.usage.tsx` for the same examples in source form.
