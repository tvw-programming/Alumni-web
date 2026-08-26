# Education / EdTech Component Library

Domain layer for course discovery, lesson playback, assessment, progress,
gamification and classroom interaction. Built **on top of** the base library in
`src/components/` — it composes `AppCard`, `AppButton`, `AppTextInput`,
`AppSheet`, `RatingStars`, `SkeletonLoader`, `StateView`, `FilterChipGroup` and
the Toast/Sheet/Confirm providers rather than duplicating them.

## Folder structure

```
src/components/education/
├── theme/educationTokens.ts      # progress.*, status.*, reward.*, mastery.*, rank.*
├── types/domain.ts               # CourseCardData, LessonItem, QuizQuestion, StreakData, …
│
├── CourseCard/
├── LessonListItem/
├── VideoPlayerControls/          VideoPlayerControls + PlaybackSpeedMenu
├── QuizQuestionCard/
├── QuizResultCard/
├── Progress/                     ProgressRing + CourseProgressBar
├── Achievements/                 CertificateCard + StreakCounter + BadgeGrid
├── FlashCard/
├── LeaderboardRow/               LeaderboardRow + LeaderboardHeader
├── AssignmentSubmissionCard/
├── LiveClassBanner/
├── NoteTakerSheet/
└── DiscussionThreadItem/
```

Every folder follows the same three-file shape:
**`Component.tsx`** · **`Component.sample.json`** (dummy data) ·
**`Component.usage.tsx`** (a real, compiling example).

The usage files are not documentation-only — the **Learn UI** tab renders them
directly, so an example that drifts from its component fails the typecheck.

## The one rule

> A learner must always know what they completed, what is next, what is optional,
> what is graded, and what happens if they leave or retry.

Enforced by construction, not convention:

| Component | What it deliberately cannot do |
|---|---|
| `CourseProgressBar` | Render 100% unless `status` says complete. A course with an ungraded project caps at 99%. |
| `CourseCard` | Treat missing progress as zero. `progress: null` renders "temporarily unavailable". |
| `LessonListItem` | Mark a lesson complete because it was opened. Completion rules live in the course service. |
| `QuizQuestionCard` | Hold the answer key in graded mode. The sample payload for graded questions has no `correct` flags. |
| `QuizResultCard` | Congratulate a learner who did not pass. Copy is chosen from the actual result. |
| `FlashCard` | Decide a review interval. It emits a recall response; the scheduler owns the rest. |
| `StreakCounter` | Erase the longest-streak record when the current one resets. |
| `LeaderboardRow` | Leak a name in anonymous mode, or require ranking for course completion. |
| `AssignmentSubmissionCard` | Overwrite a graded attempt without confirming the consequence. |
| `NoteTakerSheet` | Resolve a sync conflict silently. Both versions are shown with an explicit choice. |
| `DiscussionThreadItem` | Make a removed post vanish. Removal is stated, and deleted authors are attributed. |

## Cross-cutting standards

**Progress is wayfinding, not decoration.** Every bar carries a `detail`
sentence — "5 of 12 lessons complete · 2 more to finish this module" — and an
optional `completionRule` the learner can open. A percentage alone tells nobody
what to do next.

**Never colour alone.** Lesson state, quiz correctness, submission status, rank
movement, streak state and thread status all pair an icon with a word. Player
controls carry a text label beside every icon, and the label states the *action*
so it flips with state.

**Gamification without manipulation.** Streaks celebrate consistency and never
threaten loss; a reset streak points at rebuilding and keeps the record visible.
Rest days are a first-class state. Leaderboards support anonymous, hidden and
fully private modes, and `restrained` switches the streak card to a calm,
non-competitive presentation for contexts where pressure is counterproductive.

**Media accessibility.** The transcript is a labelled control, not an overflow
item. The speed sheet opens from the bottom so it cannot cover captions. Nothing
auto-hides mid-interaction. `FlashCard` puts "Show answer" behind a real button
so content is never locked inside a flip animation, and reduced motion turns the
flip into a cross-fade.

**Honest progress and timing.** Questionnaire-style progress is hidden entirely
when branching makes the total unreliable. The live-class countdown announces at
30/15/10/5/1 minutes rather than every second, and disappears the moment the
class starts.

## Tokens

`design-tokens/education.tokens.json` — light and dark, semantic names only:
`progressTrack`/`progressValue`/`progressComplete`, the `status*` family,
`level*`, `lesson*` by type, `reward*`/`streak*`/`badge*`, `mastery*`, `rank*`,
and `liveNow`/`liveSoon`.

One palette serves two moods: `reward.*` and `streak.*` carry the playful
character a language app wants, while everything else stays restrained enough for
academic or professional training. Read them with `useLearnTheme()`. No component
in this folder accepts a hex value.

## Usage

```tsx
import { CourseCard, CourseProgressBar } from '@ui/education';

<CourseCard
  course={course}                    // progress: null renders as "unavailable"
  variant="enrolled"
  onPress={openCourse}
  onAction={continueLearning}
  onBookmark={toggleBookmark}        // separate target from the course link
/>
```

See the running app's **Learn UI** tab for all thirteen, or read any
`*.usage.tsx` for the same examples in source form.
