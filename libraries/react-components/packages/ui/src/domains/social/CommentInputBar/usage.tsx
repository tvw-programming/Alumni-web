import { useState } from 'react';

import { CommentInputBar } from './CommentInputBar';
import sample from './sample.json';

export function CommentInputBarUsage() {
  const [value, setValue] = useState(sample.value);

  return (
    <CommentInputBar
      value={value}
      replyingTo={sample.replyingTo}
      maxLength={sample.maxLength}
      mentionCandidates={sample.mentionCandidates}
      onChange={setValue}
      onQueryChange={() => {
        /* debounced people search */
      }}
      onSubmit={async (body) => {
        const response = await fetch('/api/posts/p_1/comments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ body }),
        });
        if (!response.ok) throw await response.json();
        setValue('');
      }}
    />
  );
}
