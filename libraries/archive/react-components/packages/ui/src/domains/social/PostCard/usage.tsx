import { useQueryClient } from '@tanstack/react-query';

import { PostCard, type Post } from './PostCard';
import sample from './sample.json';

export function PostCardUsage() {
  const queryClient = useQueryClient();
  const post = sample.post as unknown as Post;

  return (
    <PostCard
      post={post}
      reactionOptions={sample.reactionOptions}
      // Optimistic through ReactionBar; a permission or network failure rolls
      // the button back without any code here.
      onReact={async (reaction) => {
        const response = await fetch(`/api/posts/${post.id}/reaction`, {
          method: reaction === undefined ? 'DELETE' : 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: reaction === undefined ? undefined : JSON.stringify({ reaction }),
        });
        if (!response.ok) throw await response.json();
        await queryClient.invalidateQueries({ queryKey: ['feed'] });
      }}
      onComment={() => {
        /* focus the comment input */
      }}
      onShare={async () => {
        await navigator.share?.({ url: `https://example.com/p/${post.id}` });
      }}
      onReport={() => {
        /* open ReportBlockSheet */
      }}
    />
  );
}
