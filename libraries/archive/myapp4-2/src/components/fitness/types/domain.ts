import type { ImageAsset } from '@ui/primitives/media';

/** Source metadata threaded through every health-adjacent reading. */
export interface HealthDataMeta {
  source?: 'manual' | 'healthKit' | 'healthConnect' | 'wearable' | 'imported';
  measuredAt?: string;
  freshness?: 'current' | 'stale' | 'unknown';
}

// ---------------------------------------------------------------------------
// 1. WorkoutCard
// ---------------------------------------------------------------------------

export type WorkoutDifficulty = 'beginner' | 'intermediate' | 'advanced';
export type WorkoutState = 'available' | 'inProgress' | 'completed' | 'scheduled' | 'locked';

export interface WorkoutCardData {
  id: string;
  title: string;
  image?: ImageAsset;
  type: string;
  durationLabel: string;
  difficulty?: WorkoutDifficulty;
  caloriesLabel?: string;
  equipmentLabel?: string;
  state?: WorkoutState;
}

// ---------------------------------------------------------------------------
// 2. ExerciseListItem
// ---------------------------------------------------------------------------

export type ExerciseStatus = 'upcoming' | 'active' | 'completed' | 'skipped' | 'substituted';

export interface ExercisePrescription {
  sets?: number;
  reps?: number | string;
  durationSeconds?: number;
  weightLabel?: string;
}

export interface ExerciseItem {
  id: string;
  name: string;
  thumbnail?: ImageAsset;
  prescription: ExercisePrescription;
  status: ExerciseStatus;
  muscleGroup?: string;
  isSuperset?: boolean;
  isWarmup?: boolean;
  personalBest?: boolean;
}

// ---------------------------------------------------------------------------
// 3. RestTimerCircle
// ---------------------------------------------------------------------------

export type RestTimerStatus = 'idle' | 'running' | 'paused' | 'complete' | 'skipped';

// ---------------------------------------------------------------------------
// 4. StepCounterRing / ActivityRings
// ---------------------------------------------------------------------------

export type RingStatus = 'active' | 'complete' | 'paused' | 'unavailable' | 'stale';

export interface ActivityRing {
  id: string;
  label: string;
  value: number;
  goal: number;
  unit: string;
  colorToken: 'ringMove' | 'ringExercise' | 'ringStand';
  status?: RingStatus;
}

// ---------------------------------------------------------------------------
// 5. WaterIntakeTracker — plain numeric props, no dedicated type needed

// ---------------------------------------------------------------------------
// 6. MealCard / MacroBreakdownBar
// ---------------------------------------------------------------------------

export type MacroKey = 'protein' | 'carbs' | 'fat';
export type MealState = 'empty' | 'partial' | 'logged' | 'loading' | 'error';

export interface MacroValue {
  key: MacroKey;
  grams: number;
  goalGrams?: number;
}

export interface LoggedFoodItem {
  id: string;
  name: string;
  servingLabel?: string;
  calories?: number;
}

export interface Meal {
  id: string;
  mealName: string;
  timeLabel?: string;
  calories?: number;
  macros: MacroValue[];
  items: LoggedFoodItem[];
  state: MealState;
}

// ---------------------------------------------------------------------------
// 7. WeightLogChart / LogEntrySheet
// ---------------------------------------------------------------------------

export type WeightUnit = 'kg' | 'lb';
export type ChartRange = '7d' | '30d' | '90d' | '1y' | 'all';

export interface WeightEntry extends HealthDataMeta {
  id: string;
  value: number;
  unit: WeightUnit;
  measuredAt: string;
}

// ---------------------------------------------------------------------------
// 8. HabitCheckRow
// ---------------------------------------------------------------------------

export type HabitDayState = 'future' | 'complete' | 'incomplete' | 'missed' | 'skipped' | 'protected';

export interface HabitDay {
  date: string;
  state: HabitDayState;
}

// ---------------------------------------------------------------------------
// 9. SleepSummaryCard
// ---------------------------------------------------------------------------

export type SleepStatus = 'available' | 'partial' | 'missing' | 'syncing' | 'stale';

export interface SleepStages {
  light?: number;
  deep?: number;
  rem?: number;
  awake?: number;
}

export interface SleepSummary {
  startAt?: string;
  endAt?: string;
  durationMinutes?: number;
  score?: number;
  goalMinutes?: number;
  stages?: SleepStages;
  source?: string;
  status: SleepStatus;
}

// ---------------------------------------------------------------------------
// 10. WorkoutPlanTimeline
// ---------------------------------------------------------------------------

export type PlanDayState = 'upcoming' | 'today' | 'completed' | 'missed' | 'rest' | 'paused';
export type PlanWorkoutStatus = 'planned' | 'inProgress' | 'completed' | 'skipped';

export interface PlanWorkout {
  id: string;
  title: string;
  durationLabel?: string;
  type: string;
  status: PlanWorkoutStatus;
}

export interface PlanDay {
  date: string;
  label: string;
  state: PlanDayState;
  workouts: PlanWorkout[];
}

// ---------------------------------------------------------------------------
// 11. PersonalRecordCard / StreakFlame
// ---------------------------------------------------------------------------

export interface PersonalRecord {
  id: string;
  label: string;
  valueLabel: string;
  activityType: string;
  achievedAt: string;
  previousValueLabel?: string;
  isNew?: boolean;
  isTied?: boolean;
  pendingSync?: boolean;
}

export type StreakStatus = 'active' | 'broken' | 'protected' | 'paused';

// ---------------------------------------------------------------------------
// 12. MeditationPlayerCard
// ---------------------------------------------------------------------------

export type MeditationType = 'guided' | 'sleepStory' | 'soundscape' | 'music' | 'breathing';
export type MeditationPlaybackState = 'idle' | 'playing' | 'paused' | 'buffering' | 'error' | 'offline';

export interface MeditationSession {
  id: string;
  title: string;
  subtitle?: string;
  image?: ImageAsset;
  durationSeconds: number;
  type: MeditationType;
}
