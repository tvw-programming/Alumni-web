import type { Attachment, ImageAsset, MediaAsset, RichText } from '@ui/primitives/media';

export type { Attachment, ImageAsset, MediaAsset, RichText };

/**
 * Social and messaging domain models.
 *
 * The organising principle from the spec: users must always know who posted,
 * what state an interaction is in, whether a message was sent or read, what a
 * button will do, and how to recover when something fails. So delivery status,
 * moderation outcome and relationship state are all explicit unions — never
 * booleans, and never inferred from the absence of data.
 */

/** Library-wide async vocabulary. */
export type AsyncState = 'idle' | 'loading' | 'success' | 'error' | 'offline' | 'stale';

export type Presence = 'online' | 'away' | 'offline' | 'unknown';

export interface UserSummary {
  id: string;
  displayName: string;
  handle?: string;
  avatar?: ImageAsset;
  verified?: boolean;
  /** "Creator", "Moderator", "Admin" — rendered as text, never an avatar ring. */
  roleLabel?: string;
  presence?: Presence;
  /** Deleted accounts stay attributed rather than blanked. */
  deleted?: boolean;
}

export type PostKind =
  | 'text'
  | 'image'
  | 'carousel'
  | 'video'
  | 'link'
  | 'quote'
  | 'poll'
  | 'sponsored';

export type PostModeration = 'visible' | 'removedByAuthor' | 'removedByModerator' | 'unavailable' | 'restricted';

export interface LinkPreview {
  url: string;
  domain: string;
  title: string;
  description?: string;
  image?: ImageAsset;
}

export interface PollOption {
  id: string;
  label: string;
  votes: number;
}

export interface Poll {
  options: PollOption[];
  totalVotes: number;
  /** Set once the viewer has voted. */
  votedOptionId?: string;
  closesAt?: string;
  closed?: boolean;
}

export interface Post {
  id: string;
  author: UserSummary;
  kind: PostKind;
  body?: RichText;
  media?: MediaAsset[];
  link?: LinkPreview;
  poll?: Poll;
  /** The quoted post, for reposts with commentary. */
  quotedPost?: Post;
  createdAt: string;
  editedAt?: string;
  /** "Public", "Followers", "Close friends". */
  audienceLabel?: string;
  locationLabel?: string;
  pinned?: boolean;
  sponsored?: boolean;
  moderation?: PostModeration;
  moderationNote?: string;
  /** Shown before sensitive media renders. */
  contentWarning?: string;
  translatedFrom?: string;
  /** Cached copy shown while offline. */
  fromCache?: boolean;
}

export interface ReactionDefinition {
  id: string;
  label: string;
  icon: string;
  /** Fallback glyph so a reaction reads in monochrome. */
  glyph?: string;
}

export interface ReactionState {
  /** reaction id → count. */
  counts: Record<string, number>;
  /** The viewer's own reaction, if any. */
  userReaction?: string;
  commentCount?: number;
  shareCount?: number;
  saved?: boolean;
  /** Counts withheld by product policy — say so rather than showing zero. */
  countsHidden?: boolean;
  hiddenReason?: string;
}

export type CommentModeration = 'visible' | 'removedByAuthor' | 'removedByModerator' | 'pending';

export type CommentStatus = 'sending' | 'sent' | 'failed' | 'editing';

export interface Comment {
  id: string;
  author: UserSummary;
  body: RichText;
  createdAt: string;
  editedAt?: string;
  likeCount?: number;
  userLiked?: boolean;
  replyCount?: number;
  /** Depth for nesting; the row states it in text too. */
  depth?: number;
  parentId?: string;
  parentAuthorName?: string;
  pinned?: boolean;
  byCreator?: boolean;
  moderation?: CommentModeration;
  moderationNote?: string;
  status?: CommentStatus;
  /** Client id for an optimistic insert, before the server assigns one. */
  clientId?: string;
  mentions?: UserSummary[];
}

export type StoryAudience = 'public' | 'followers' | 'closeFriends';

export interface StoryItem {
  id: string;
  user: UserSummary;
  hasUnseen: boolean;
  segmentCount?: number;
  seenCount?: number;
  isLive?: boolean;
  audience?: StoryAudience;
  sponsored?: boolean;
  /** Own-story tile that opens the composer. */
  isOwn?: boolean;
  uploadState?: 'idle' | 'uploading' | 'failed';
  uploadProgress?: number;
  expired?: boolean;
}

export interface StorySegment {
  id: string;
  media: MediaAsset;
  durationMs: number;
  createdAt: string;
  /** Text overlay, exposed to assistive tech as part of the segment. */
  caption?: string;
}

export type Relationship = 'none' | 'following' | 'requested' | 'blocked' | 'restricted' | 'notAllowed';

export type ProfileKind = 'personal' | 'creator' | 'business';

export interface ProfileStats {
  posts?: number;
  followers?: number;
  following?: number;
  /** LinkedIn-style: connections are distinct from followers. */
  connections?: number;
}

export interface UserProfile {
  user: UserSummary;
  cover?: ImageAsset;
  bio?: string;
  headline?: string;
  organization?: string;
  websiteUrl?: string;
  location?: string;
  stats: ProfileStats;
  relationship: Relationship;
  privacy: 'public' | 'private';
  /** Set when the viewer is looking at their own profile. */
  isOwnProfile?: boolean;
  mutualCount?: number;
  joinedAt?: string;
  /** Explains a blocked / restricted / suspended account. */
  statusNote?: string;
}

export type MessageDirection = 'sent' | 'received';

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed' | 'played';

export type MessageModeration = 'visible' | 'deletedForEveryone' | 'deletedForMe' | 'moderated';

export interface MessageReference {
  id: string;
  authorName: string;
  preview: string;
}

export interface MessageReaction {
  emoji: string;
  count: number;
  reactedByMe?: boolean;
}

export interface Message {
  id: string;
  conversationId: string;
  sender: UserSummary;
  body?: RichText;
  sentAt: string;
  direction: MessageDirection;
  status: MessageStatus;
  replyTo?: MessageReference;
  attachments?: Attachment[];
  reactions?: MessageReaction[];
  editedAt?: string;
  forwarded?: boolean;
  moderation?: MessageModeration;
  /** Disappearing message. */
  expiresAt?: string;
  /** Voice note duration in seconds. */
  voiceDurationSeconds?: number;
  /** System messages are centred and unattributed. */
  system?: boolean;
  clientId?: string;
}

export type ConversationKind = 'direct' | 'group' | 'channel' | 'request' | 'support';

export interface Conversation {
  id: string;
  kind: ConversationKind;
  title: string;
  avatar?: ImageAsset;
  participants?: UserSummary[];
  /** Rendered with its type when there is no text: "Photo", "Voice message". */
  lastMessagePreview?: string;
  lastMessageKind?: 'text' | 'photo' | 'video' | 'voice' | 'document' | 'unavailable';
  lastMessageAt?: string;
  lastMessageStatus?: MessageStatus;
  unreadCount?: number;
  mentionCount?: number;
  muted?: boolean;
  pinned?: boolean;
  archived?: boolean;
  /** Names of people currently typing. */
  typingUsers?: string[];
  draft?: string;
  presence?: Presence;
  /** Sync failure for this thread specifically. */
  syncFailed?: boolean;
}

export interface TypingState {
  users: string[];
  /** Stale indicators are hidden rather than left spinning. */
  updatedAt: string;
}

export interface MentionCandidate {
  user: UserSummary;
  /** Why this account cannot be mentioned, when it cannot. */
  disabledReason?: string;
  /** Their privacy settings mean no notification is sent. */
  willNotBeNotified?: boolean;
}

export type MediaTileState = 'ready' | 'loading' | 'uploading' | 'processing' | 'broken' | 'restricted';

export interface MediaTile {
  id: string;
  media: MediaAsset;
  state: MediaTileState;
  /** Multi-image posts show a stack indicator. */
  itemCount?: number;
  durationLabel?: string;
  uploadProgress?: number;
  restrictedReason?: string;
  contentWarning?: string;
}

export type ModerationAction = 'report' | 'block' | 'mute' | 'restrict' | 'hide';

export type ReportEscalation = 'none' | 'safety' | 'selfHarm' | 'childSafety';

export interface ReportReason {
  id: string;
  label: string;
  description?: string;
  requiresDetails?: boolean;
  escalation?: ReportEscalation;
}

export type ReportTarget = 'post' | 'comment' | 'message' | 'profile' | 'story';

export interface ModerationOutcome {
  action: ModerationAction;
  reasonId?: string;
  details?: string;
  targetId: string;
  targetKind: ReportTarget;
  submittedAt: string;
}
