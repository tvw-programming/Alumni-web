import AddIcon from '@mui/icons-material/Add';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { describe, timeLabel } from '../../../foundation';

export interface Story {
  id: string;
  author: string;
  avatarUri?: string;
  postedAt: string;
  seen: boolean;
  /** Set while the user's own story is still uploading. */
  uploadProgress?: number;
}

export interface StoryTrayProps {
  stories: Story[];
  onOpen: (id: string) => void;
  onAddStory?: () => void;
}

/**
 * The horizontal story rail.
 *
 * Seen and unseen are distinguished by a ring *and* by the label. A ring alone
 * is a colour signal, and "seen" is exactly the sort of state that never
 * reaches assistive technology when it lives in a border.
 *
 * The rail is a real horizontal scroller with `overflow-x: auto` rather than a
 * carousel with buttons: it is what a touch device expects, and a keyboard user
 * still tabs through the items.
 */
export function StoryTray({ stories, onOpen, onAddStory }: StoryTrayProps) {
  return (
    <Stack
      direction="row"
      spacing={2}
      sx={{ overflowX: 'auto', pb: 1, px: 0.5 }}
      role="list"
      aria-label="Stories"
    >
      {onAddStory ? (
        <Stack alignItems="center" spacing={0.5} role="listitem" sx={{ flexShrink: 0 }}>
          <Box
            component="button"
            type="button"
            onClick={onAddStory}
            aria-label="Add your story"
            sx={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              border: '2px dashed',
              borderColor: 'divider',
              bgcolor: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main' },
            }}
          >
            <AddIcon />
          </Box>
          <Typography variant="caption" noWrap sx={{ maxWidth: 72 }}>
            Your story
          </Typography>
        </Stack>
      ) : null}

      {stories.map((story) => (
        <Stack
          key={story.id}
          alignItems="center"
          spacing={0.5}
          role="listitem"
          sx={{ flexShrink: 0 }}
        >
          <Box
            component="button"
            type="button"
            onClick={() => {
              onOpen(story.id);
            }}
            aria-label={describe(
              `${story.author}'s story`,
              story.uploadProgress !== undefined
                ? `uploading, ${String(story.uploadProgress)} percent`
                : story.seen
                  ? 'already seen'
                  : 'new',
              timeLabel(story.postedAt),
            )}
            sx={{
              p: 0,
              borderRadius: '50%',
              border: '2px solid',
              borderColor: story.seen ? 'divider' : 'primary.main',
              bgcolor: 'transparent',
              cursor: 'pointer',
              opacity: story.uploadProgress === undefined ? 1 : 0.6,
              '&:focus-visible': {
                outline: '2px solid',
                outlineColor: 'primary.main',
                outlineOffset: 2,
              },
            }}
          >
            <Avatar src={story.avatarUri} alt="" sx={{ width: 60, height: 60, m: 0.25 }}>
              {story.author.charAt(0)}
            </Avatar>
          </Box>
          <Typography
            variant="caption"
            noWrap
            sx={{ maxWidth: 72, fontWeight: story.seen ? 400 : 600 }}
            aria-hidden
          >
            {story.author}
          </Typography>
        </Stack>
      ))}
    </Stack>
  );
}
