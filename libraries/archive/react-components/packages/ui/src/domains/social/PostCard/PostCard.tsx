import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import ShareOutlinedIcon from '@mui/icons-material/ShareOutlined';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { memo, useState } from 'react';

import { countLabel, describe, timeLabel, type PostId } from '../../../foundation';

import { ReactionBar, type ReactionOption, type ReactionSummary } from '../ReactionBar/ReactionBar';

export interface UserSummary {
  id: string;
  name: string;
  handle?: string;
  avatarUri?: string;
}

export interface MediaAsset {
  id: string;
  uri: string;
  /** Required. A media post with no alt text is unreadable to some users. */
  alt: string;
  kind: 'image' | 'video';
}

export interface Post {
  id: PostId;
  author: UserSummary;
  body?: string;
  media?: MediaAsset[];
  createdAt: string;
  edited?: boolean;
  visibility?: string;
  reactions: ReactionSummary;
  commentCount: number;
  /** Blurs the media behind a click-through. */
  contentWarning?: string;
}

export interface PostCardProps {
  post: Post;
  reactionOptions: ReactionOption[];
  onReact?: (reaction: string | undefined) => Promise<void>;
  onComment?: () => void;
  onShare?: () => Promise<void>;
  onReport?: () => void;
}

/**
 * A feed post.
 *
 * Composes `ReactionBar` rather than reimplementing reactions — the optimistic
 * behaviour is subtle enough that two copies of it would diverge.
 *
 * `alt` on `MediaAsset` is **required, not optional**. A type that permits
 * missing alt text produces posts with missing alt text; making it required
 * pushes the problem to the upload flow, where someone can actually write one.
 *
 * A content warning blurs the media until the reader chooses to see it, and the
 * warning text says what they would be choosing.
 */
export const PostCard = memo(function PostCard({
  post,
  reactionOptions,
  onReact,
  onComment,
  onShare,
  onReport,
}: PostCardProps) {
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [revealed, setRevealed] = useState(post.contentWarning === undefined);

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          <Avatar src={post.author.avatarUri} alt="" sx={{ width: 40, height: 40 }}>
            {post.author.name.charAt(0)}
          </Avatar>

          <Stack sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography
              variant="subtitle2"
              fontWeight={700}
              aria-label={describe(
                post.author.name,
                post.author.handle,
                `posted ${timeLabel(post.createdAt)}`,
                post.edited === true ? 'edited' : undefined,
                post.visibility,
              )}
            >
              {post.author.name}
            </Typography>
            <Typography variant="caption" color="text.secondary" aria-hidden>
              {[
                post.author.handle,
                timeLabel(post.createdAt),
                post.edited === true ? 'edited' : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </Typography>
          </Stack>

          {post.visibility ? (
            <Chip size="small" variant="outlined" label={post.visibility} />
          ) : null}

          <IconButton
            size="small"
            aria-label="Post options"
            onClick={(event) => {
              setMenuAnchor(event.currentTarget);
            }}
          >
            <MoreHorizIcon />
          </IconButton>
          <Menu
            anchorEl={menuAnchor}
            open={menuAnchor !== null}
            onClose={() => {
              setMenuAnchor(null);
            }}
          >
            <MenuItem
              onClick={() => {
                setMenuAnchor(null);
                onReport?.();
              }}
            >
              Report post
            </MenuItem>
          </Menu>
        </Stack>

        {post.body ? (
          <Typography variant="body2" sx={{ mt: 1.5, whiteSpace: 'pre-wrap' }}>
            {post.body}
          </Typography>
        ) : null}

        {post.media?.length ? (
          <Box sx={{ mt: 1.5, position: 'relative' }}>
            {!revealed ? (
              <Stack
                spacing={1}
                alignItems="center"
                sx={{
                  position: 'absolute',
                  inset: 0,
                  zIndex: 1,
                  justifyContent: 'center',
                  bgcolor: 'action.disabledBackground',
                  borderRadius: 2,
                }}
              >
                <Typography variant="body2" fontWeight={600}>
                  {post.contentWarning}
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => {
                    setRevealed(true);
                  }}
                >
                  Show anyway
                </Button>
              </Stack>
            ) : null}

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: post.media.length > 1 ? '1fr 1fr' : '1fr',
                gap: 0.5,
                filter: revealed ? 'none' : 'blur(18px)',
              }}
            >
              {post.media.map((asset) => (
                <Box
                  key={asset.id}
                  component="img"
                  src={asset.uri}
                  alt={asset.alt}
                  sx={{
                    width: '100%',
                    aspectRatio: '16 / 10',
                    objectFit: 'cover',
                    borderRadius: 2,
                    bgcolor: 'action.hover',
                  }}
                />
              ))}
            </Box>
          </Box>
        ) : null}

        <Divider sx={{ my: 1.5 }} />

        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          {onReact ? (
            <ReactionBar summary={post.reactions} options={reactionOptions} onReact={onReact} />
          ) : null}

          <Stack direction="row" spacing={0.5} sx={{ ml: 'auto' }}>
            <Button
              size="small"
              startIcon={<ChatBubbleOutlineIcon />}
              onClick={onComment}
              aria-label={`Comment, ${countLabel(post.commentCount)} comments`}
            >
              {countLabel(post.commentCount)}
            </Button>
            {onShare ? (
              <Button
                size="small"
                startIcon={<ShareOutlinedIcon />}
                onClick={() => {
                  void onShare();
                }}
                aria-label="Share post"
              >
                Share
              </Button>
            ) : null}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
});
