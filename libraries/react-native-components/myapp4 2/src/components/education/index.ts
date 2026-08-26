/**
 * EDUCATION / EDTECH COMPONENT LIBRARY
 *
 * Domain layer on top of the base library in `src/components/`. Same
 * portability rule as the other domain libraries: nothing here imports from
 * `src/features`, `src/store` or `src/services`.
 *
 * The principle the spec ends on is what these components are built around —
 * a learner must always know what they completed, what is next, what is
 * optional, what is graded, and what happens if they leave or retry:
 *
 *   - `CourseProgressBar` refuses to render 100% unless status says complete
 *   - `LessonListItem` never marks a lesson done because it was opened
 *   - `QuizQuestionCard` never holds the answer key in graded mode
 *   - `QuizResultCard` never congratulates a learner who did not pass
 *   - `FlashCard` emits a recall response; the scheduler owns the interval
 *   - `StreakCounter` keeps the longest-streak record after a reset
 *   - `LeaderboardRow` supports anonymous, hidden and fully private modes
 *   - `AssignmentSubmissionCard` confirms before overwriting a graded attempt
 *   - `NoteTakerSheet` never resolves a sync conflict silently
 *   - `DiscussionThreadItem` shows removed posts as removed
 */

// Foundations
export * from './theme/educationTokens';
export * from './types';

// Components
export * from './CourseCard';
export * from './LessonListItem';
export * from './VideoPlayerControls';
export * from './QuizQuestionCard';
export * from './QuizResultCard';
export * from './Progress';
export * from './Achievements';
export * from './FlashCard';
export * from './LeaderboardRow';
export * from './AssignmentSubmissionCard';
export * from './LiveClassBanner';
export * from './NoteTakerSheet';
export * from './DiscussionThreadItem';
