# Social & Messaging Component Library

Domain layer for feeds, stories, profiles, messaging, mentions, media and
moderation. Built **on top of** the base library in `src/components/` — it
composes `AppCard`, `AppButton`, `AppTextInput`, `AppSheet`, `ListItemRow`,
`SkeletonLoader`, `StateView` and the Toast/Sheet/Confirm providers rather than
duplicating them.

## Folder structure

```
src/components/social/
├── theme/socialTokens.ts         # surface.message.*, status.unread/online, story.unseenRing, …
├── types/domain.ts               # Post, Comment, Message, Conversation, StoryItem, ReportReason, …
├── primitives/
│   ├── SocialAvatar.tsx          # avatar + presence + AuthorLine (name, verification, role)
│   └── RichBody.tsx              # mentions, hashtags, links, "Show more"
│
├── PostCard/                     + PostMedia.tsx   (carousel, video, content warnings)
├── ReactionBar/
├── Comments/                     CommentItem + CommentInputBar
├── Stories/                      StoryRing + StoryTray + StoryViewer
├── UserProfileHeader/
├── FollowButton/
├── MessageBubble/
├── ChatInputBar/
├── ConversationListItem/
├── MessageStatus/                MessageStatusIcon + TypingIndicator
├── MentionTextInput/
├── MediaGridViewer/
└── ReportBlockSheet/
```

Every folder follows the same three-file shape:
**`Component.tsx`** · **`Component.sample.json`** (dummy data) ·
**`Component.usage.tsx`** (a real, compiling example).

The usage files are not documentation-only — the **Social UI** tab renders them
directly, so an example that drifts from its component fails the typecheck.

## The one rule

> Users should always know who posted, what state an interaction is in, whether
> a message was sent or read, what a button will do, and how to recover when
> media, delivery or moderation operations fail.

Enforced by construction:

| Component | What it deliberately cannot do |
|---|---|
| `PostCard` | Be one giant tap target. Author, links, media, reactions and overflow are separate focus targets. |
| `ReactionBar` | Signal selection by colour alone. Reactions are announced by name, and a failed mutation rolls back with a retry. |
| `MessageStatusIcon` | Show "Read" when the recipient disabled receipts — it falls back to Delivered. |
| `MessageBubble` | Let a failed message disappear. It stays in place with a retry. |
| `TypingIndicator` | Animate forever. A stale indicator is hidden, and reduced motion gets a static ellipsis. |
| `FollowButton` | Present a pending request as an established follow. `requested` is its own state. |
| `MentionTextInput` | Insert a display name without a stable user id, or let a stale search response win a race. |
| `StoryViewer` | Rely on gestures. Pause, previous, next and close are all real buttons. |
| `MediaGridViewer` | Autoplay video in the grid, or reflow as images load. |
| `ReportBlockSheet` | Promise a moderation outcome or a timeline. |
| Post / comment / message | Silently vanish when removed. Each renders a tombstone naming who removed it. |

## Cross-cutting standards

**Never colour alone.** Unread carries a badge, a weight change and the word
"unread". Sender is carried by alignment *and* a name *and* semantics. Delivery
status pairs a glyph with a label. Story unseen state is in the caption, not just
the gradient ring.

**Optimistic updates always have a way back.** Reactions, comments, follows and
messages all apply immediately, keep a temporary client id, and expose a visible
retry when the server rejects them — the failure state is a first-class render,
not a silent revert.

**Moderation is honest.** Report / block / mute / restrict each explain what they
actually do, because people pick the wrong one constantly — muting is invisible
to the other person and blocking is not. Safety reasons surface the emergency
escalation the moment they are selected, and the confirmation says the report was
received and will be reviewed, never what will happen to the account.

**Media is opt-in.** Video never autoplays. Sensitive media stays behind a
content warning until the viewer chooses. Every asset carries real alt text —
the sample payloads are written so a screen reader gets a useful description, and
the unreachable image URIs make that fallback visible while you develop.

**Privacy.** Read receipts are respected rather than approximated. Anonymous and
hidden leaderboard-style entries never leak a display name. Report text goes to
the moderation queue, never to analytics.

## Tokens

`design-tokens/social.tokens.json` — light and dark, semantic names only:
`surfaceFeed`, `surfaceMessageSent`/`Received`, `statusUnread`/`Online`/`Error`/`Moderated`,
`delivery*`, `reaction*`, `story*`, `verified`, `mention`, `sponsored`, `focusRing`.

Read them with `useSocialTheme()`. No component in this folder accepts a hex value.

## Usage

```tsx
import { PostCard, ReactionBar, MessageBubble } from '@ui/social';

<PostCard
  post={post}
  reactions={reactions[post.id]}
  onReact={(id, reaction) => mutate(id, reaction)}   // caller owns the mutation
  onOpenMedia={openViewer}
  overflowActions={[{ key: 'report', label: 'Report post', destructive: true, onPress: openReport }]}
/>
```

See the running app's **Social UI** tab for all thirteen, or read any
`*.usage.tsx` for the same examples in source form.
