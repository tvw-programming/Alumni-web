/**
 * FITNESS & WELLNESS COMPONENT LIBRARY (React Native Paper)
 *
 * Domain layer on top of the base library in `src/components/`. Same
 * portability rule as the other domain libraries: nothing here imports from
 * `src/features`, `src/store` or `src/services`. Built directly on React
 * Native Paper primitives per the spec's own component guide — `Card`,
 * `Surface`, `Chip`, `ProgressBar`, `Checkbox`, `List.Item`/`List.Accordion`,
 * `Menu`, `SegmentedButtons`, `ActivityIndicator`, `Dialog`/`Portal` (via the
 * shared `AppSheet`) — with SVG ring rendering for timers and activity
 * rings, since Paper has no dedicated circular-progress primitive.
 *
 * The organising principle from the spec — supportive clarity. Users should
 * understand what they logged, where they stand relative to a goal, whether
 * data is synced or stale, what action comes next, and how the system
 * behaves when a habit, workout, timer, sensor, or playback session is
 * interrupted:
 *
 *   - `WorkoutCard` always labels a calorie figure as an estimate, never a guarantee
 *   - `ExerciseListItem` never makes an animated thumbnail the only source
 *     of instruction — prescription is always rendered as text
 *   - `RestTimerCircle` keeps the numeric countdown primary; colour only
 *     shifts to urgent in the final seconds
 *   - `ActivityRings` / `StepCounterRing` are reserved for a small set of
 *     related personal goals, always state whose progress they show, and
 *     ship a full text equivalent alongside every ring
 *   - `WaterIntakeTracker` never lets rapid taps double-count — each tap is
 *     one intent, reconciled by the intake service
 *   - `MealCard` / `MacroBreakdownBar` never derive calories from macros or
 *     vice versa — both come from the nutrition service as given
 *   - `WeightLogChart` never uses value-judgement language, and every
 *     plotted point is also listed as an exact, dated value
 *   - `HabitCheckRow` never uses shame-based copy for a missed day and never
 *     erases a longest streak on reset
 *   - `SleepSummaryCard` never presents a sleep score as a diagnosis
 *   - `WorkoutPlanTimeline` keeps the collapsed accordion row useful on its
 *     own, before any detail is expanded
 *   - `PersonalRecordCard` / `StreakFlame` keep record detection and streak
 *     rules in a server service; the streak flame preserves the longest
 *     streak even after the current one breaks
 *   - `MeditationPlayerCard` never assumes every session type supports
 *     identical timer or autoplay behaviour
 */

// Foundations
export * from './theme/fitnessTokens';
export * from './types';
export * from './primitives';

// Components
export * from './WorkoutCard';
export * from './ExerciseListItem';
export * from './RestTimerCircle';
export * from './ActivityRings';
export * from './WaterIntakeTracker';
export * from './MealCard';
export * from './WeightLogChart';
export * from './HabitCheckRow';
export * from './SleepSummaryCard';
export * from './WorkoutPlanTimeline';
export * from './PersonalRecordAndStreak';
export * from './MeditationPlayerCard';
