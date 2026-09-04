/**
 * SOCIAL & MESSAGING COMPONENT LIBRARY
 *
 * Domain layer on top of the base library in `src/components/`. Same
 * portability rule as the other domain libraries: nothing here imports from
 * `src/features`, `src/store` or `src/services`.
 *
 * The organising principle from the spec — users must always know who posted,
 * what state an interaction is in, whether a message was sent or read, what a
 * button will do, and how to recover when something fails:
 *
 *   - `PostCard` is not one giant tap target; author, links, media, reactions
 *     and overflow are separate focus targets
 *   - `ReactionBar` announces reactions by name and rolls back failed mutations
 *   - `MessageStatusIcon` refuses to show "Read" when receipts are disabled
 *   - `MessageBubble` keeps failed messages in place with a retry
 *   - `TypingIndicator` hides a stale indicator instead of spinning forever
 *   - `FollowButton` never presents a pending request as an established follow
 *   - `MentionTextInput` discards stale search responses and never inserts a
 *     display name without a stable user id
 *   - `StoryViewer` gives every gesture an explicit button equivalent
 *   - `ReportBlockSheet` promises no moderation outcome or timeline
 *   - Removed posts, comments and messages render a tombstone rather than
 *     silently disappearing
 */

// Foundations
export * from './theme/socialTokens';
export * from './types';
export * from './primitives/SocialAvatar';
export * from './primitives/RichBody';

// Content and engagement
export * from './PostCard';
export * from './ReactionBar';
export * from './Comments';

// Stories and profiles
export * from './Stories';
export * from './UserProfileHeader';
export * from './FollowButton';

// Messaging
export * from './MessageBubble';
export * from './ChatInputBar';
export * from './ConversationListItem';
export * from './MessageStatus';

// Mentions, media and moderation
export * from './MentionTextInput';
export * from './MediaGridViewer';
export * from './ReportBlockSheet';
