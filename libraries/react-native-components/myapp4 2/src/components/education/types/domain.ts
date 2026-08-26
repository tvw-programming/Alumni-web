import type { Attachment, ImageAsset, MediaAsset, RichText } from '@ui/primitives/media';

export type { Attachment, ImageAsset, MediaAsset, RichText };

/**
 * Education domain models.
 *
 * The principle the spec ends on drives these types: a learner must always know
 * what they completed, what is next, what is optional, what is graded, and what
 * happens if they leave or retry. So completion, optionality and grading are
 * explicit fields — never inferred from "did they open it".
 */

/** Library-wide async vocabulary. */
export type LearnState =
  | 'idle'
  | 'loading'
  | 'saving'
  | 'success'
  | 'empty'
  | 'error'
  | 'offline'
  | 'locked'
  | 'completed'
  | 'requiresAction';

/** Learning progress is its own vocabulary, distinct from async state. */
export type LearningStatus =
  | 'notStarted'
  | 'started'
  | 'inProgress'
  | 'completed'
  | 'mastered'
  | 'passed'
  | 'failed'
  | 'pendingReview';

export type CourseLevel = 'beginner' | 'intermediate' | 'advanced';

export type EnrollmentState = 'notEnrolled' | 'inProgress' | 'completed' | 'locked';

export interface CourseCardData {
  id: string;
  title: string;
  instructor?: string;
  provider?: string;
  thumbnail: ImageAsset;
  duration?: string;
  lessonCount?: number;
  level?: CourseLevel;
  /** 0–100. Undefined means "not available", which is not the same as 0. */
  progress?: number;
  enrollmentState: EnrollmentState;
  actionLabel?: string;
  rating?: { average: number; count: number };
  enrolledCount?: number;
  lockedReason?: string;
  /** Cached for offline use — shown so the learner knows why it still works. */
  availableOffline?: boolean;
  /** What "complete" means for this course. Surfaced in help text. */
  completionRule?: string;
}

export type LessonType = 'video' | 'reading' | 'quiz' | 'assignment' | 'project';

export type LessonState =
  | 'notStarted'
  | 'playing'
  | 'completed'
  | 'locked'
  | 'loading'
  | 'downloading'
  | 'downloaded'
  | 'error';

export interface LessonItem {
  id: string;
  title: string;
  type: LessonType;
  duration?: string;
  state: LessonState;
  /** 0–100 within the lesson. */
  progress?: number;
  lockedReason?: string;
  /** Optional content is excluded from completion totals. */
  optional?: boolean;
  /** A failed graded attempt is distinct from "not started". */
  attemptFailed?: boolean;
  downloadProgress?: number;
  errorMessage?: string;
}

export type PlaybackState = 'loading' | 'playing' | 'paused' | 'buffering' | 'error' | 'ended';

export type VideoQuality = 'auto' | '1080p' | '720p' | '480p' | '360p' | 'audioOnly';

export interface PlaybackStatus {
  state: PlaybackState;
  /** Seconds. */
  position: number;
  duration: number;
  /** Seconds buffered ahead of the play head. */
  buffered?: number;
  speed: number;
  volume: number;
  muted: boolean;
  captionsEnabled: boolean;
  quality: VideoQuality;
  fullscreen?: boolean;
  errorMessage?: string;
  offline?: boolean;
}

export interface QuizOption {
  id: string;
  label: RichText;
  /** Only ever sent to the client in review mode. */
  correct?: boolean;
  explanation?: string;
}

export type QuestionType = 'single' | 'multiple' | 'trueFalse';

export interface QuizQuestion {
  id: string;
  type: QuestionType;
  prompt: RichText;
  options?: QuizOption[];
  media?: MediaAsset;
  required?: boolean;
  minSelections?: number;
  /** Shown after submission in review mode. */
  explanation?: string;
  points?: number;
}

/** Practice corrects immediately; graded withholds feedback until submission. */
export type QuizMode = 'practice' | 'graded';

export type QuestionState =
  | 'unanswered'
  | 'answered'
  | 'correct'
  | 'incorrect'
  | 'reviewing'
  | 'submitted'
  | 'timedOut';

export interface QuizResult {
  score: number;
  maxScore: number;
  percentage: number;
  status: 'passed' | 'failed' | 'pending' | 'error';
  passingPercentage?: number;
  correctCount?: number;
  totalCount?: number;
  attemptsUsed?: number;
  attemptsRemaining?: number;
  completedInSeconds?: number;
  /** Topics to revisit — accurate encouragement beats vague praise. */
  weakTopics?: string[];
  certificateEligible?: boolean;
  errorMessage?: string;
}

export interface ProgressValue {
  value: number;
  min?: number;
  max?: number;
  label: string;
  status?: 'notStarted' | 'inProgress' | 'complete' | 'error' | 'stale';
  /** "3 of 12 lessons complete" — the sentence a percentage cannot say. */
  detail?: string;
  /** Explains exactly what counts toward this number. */
  completionRule?: string;
}

export interface Certificate {
  id: string;
  courseTitle: string;
  learnerName: string;
  issuedAt: string;
  credentialId: string;
  previewImage?: ImageAsset;
  verifyUrl?: string;
  status: 'available' | 'processing' | 'unavailable';
  unavailableReason?: string;
}

export interface StreakDay {
  /** ISO date. */
  date: string;
  met: boolean;
  /** A used freeze/rest day — not a broken streak. */
  frozen?: boolean;
}

export interface StreakData {
  current: number;
  longest: number;
  /** Today's goal progress, 0–1. */
  goalProgress: number;
  goalLabel: string;
  history: StreakDay[];
  freezesAvailable?: number;
  /** True when today's goal is not yet met and the day is nearly over. */
  atRisk?: boolean;
}

export interface Badge {
  id: string;
  title: string;
  description: string;
  icon: string;
  earned: boolean;
  earnedAt?: string;
  /** 0–1 toward earning it. */
  progress?: number;
  progressLabel?: string;
  category?: string;
  /** Hidden badges reveal only their existence, not their criteria. */
  hidden?: boolean;
}

export type Movement = 'up' | 'down' | 'same';

export interface LeaderboardEntry {
  userId: string;
  rank: number;
  displayName: string;
  avatar?: ImageAsset;
  points: number;
  movement?: Movement;
  isCurrentUser?: boolean;
  /** Learners can appear anonymously or opt out entirely. */
  privacyMode?: 'public' | 'anonymous' | 'hidden';
  tiedWith?: number;
}

export type Mastery = 'new' | 'learning' | 'review' | 'mastered';

export interface FlashCardData {
  id: string;
  front: RichText;
  back: RichText;
  media?: MediaAsset[];
  mastery?: Mastery;
  hint?: string;
}

/** The scheduler consumes these; the card only emits them. */
export type RecallResponse = 'again' | 'hard' | 'good' | 'easy';

export type SubmissionStatus =
  | 'notStarted'
  | 'draft'
  | 'uploading'
  | 'submitted'
  | 'late'
  | 'graded'
  | 'revisionRequired'
  | 'error';

export interface AssignmentSubmission {
  assignmentId: string;
  title: string;
  instructions?: string;
  dueAt?: string;
  status: SubmissionStatus;
  files: Attachment[];
  grade?: string;
  feedback?: string;
  submittedAt?: string;
  /** Late work allowed is a policy, not an error. */
  lateSubmissionsAllowed?: boolean;
  latePenaltyNote?: string;
  /** Resubmitting may overwrite the previous attempt and score. */
  resubmissionOverwrites?: boolean;
  acceptedFileTypes?: string[];
  maxFileSizeBytes?: number;
  maxFiles?: number;
}

export type LiveClassStatus = 'scheduled' | 'startingSoon' | 'live' | 'ended' | 'canceled';

export interface LiveClass {
  id: string;
  title: string;
  instructor?: string;
  startsAt: string;
  endsAt?: string;
  timezoneLabel?: string;
  status: LiveClassStatus;
  joinUrl?: string;
  reminderEnabled?: boolean;
  recordingAvailable?: boolean;
  coverImage?: ImageAsset;
  /** Rescheduled or canceled classes explain themselves. */
  statusNote?: string;
  seatsRemaining?: number;
  accessRestrictedReason?: string;
}

export type NoteStatus = 'draft' | 'saving' | 'saved' | 'offline' | 'conflict' | 'error';

export interface Note {
  id: string;
  title?: string;
  body: RichText;
  lessonId?: string;
  lessonTitle?: string;
  /** Deep-links back into the video. */
  timestampSeconds?: number;
  updatedAt: string;
  status: NoteStatus;
  pinned?: boolean;
  readOnly?: boolean;
  /** Populated when the server has a newer version. */
  conflictingBody?: string;
}

export type ThreadStatus = 'open' | 'resolved' | 'locked' | 'removed';

export type AuthorRole = 'learner' | 'instructor' | 'moderator';

export interface DiscussionThread {
  id: string;
  title: string;
  preview?: string;
  author: {
    id: string;
    name: string;
    avatar?: ImageAsset;
    role?: AuthorRole;
    /** Deleted accounts still leave honest attribution. */
    deleted?: boolean;
  };
  replyCount: number;
  reactionCount?: number;
  status: ThreadStatus;
  unread?: boolean;
  pinned?: boolean;
  updatedAt: string;
  /** Course / week / lesson context, so forums are not an undifferentiated feed. */
  contextLabel?: string;
  hasInstructorReply?: boolean;
  removedReason?: string;
}
