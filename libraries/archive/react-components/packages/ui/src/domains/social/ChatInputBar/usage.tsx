import { useState } from 'react';

import { ChatInputBar } from './ChatInputBar';
import sample from './sample.json';

import type { ChatMessage } from '../ChatBubble/ChatBubble';

export function ChatInputBarUsage() {
  // The draft lives above the composer so it survives re-renders from incoming
  // messages. In a real app, persist it per conversation.
  const [value, setValue] = useState(sample.value);
  const [replyTo, setReplyTo] = useState<ChatMessage | undefined>(
    sample.replyTo as unknown as ChatMessage,
  );

  return (
    <ChatInputBar
      value={value}
      replyTo={replyTo}
      attachments={sample.attachments}
      onChange={setValue}
      onCancelReply={() => {
        setReplyTo(undefined);
      }}
      onAttach={() => {
        /* open the file picker */
      }}
      onSend={async () => {
        const response = await fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ body: value, replyToId: replyTo?.id }),
        });
        if (!response.ok) throw await response.json();
        // Cleared only after the send resolves. Clearing on click loses the
        // text exactly when the user most wants it back.
        setValue('');
        setReplyTo(undefined);
      }}
    />
  );
}
