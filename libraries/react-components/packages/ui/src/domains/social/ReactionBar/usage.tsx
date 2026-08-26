import { useQueryClient } from '@tanstack/react-query';

import { ReactionBar } from './ReactionBar';
import sample from './sample.json';

export function ReactionBarUsage() {
  const queryClient = useQueryClient();

  return (
    <ReactionBar
      summary={sample.summary}
      options={sample.options}
      // Rejecting rolls the button back on its own — React discards the
      // optimistic value when the Action settles.
      onReact={async (key) => {
        const response = await fetch('/api/posts/p_1/reaction', {
          method: key === undefined ? 'DELETE' : 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: key === undefined ? undefined : JSON.stringify({ reaction: key }),
        });
        if (!response.ok) throw await response.json();
        await queryClient.invalidateQueries({ queryKey: ['posts', 'p_1'] });
      }}
    />
  );
}
