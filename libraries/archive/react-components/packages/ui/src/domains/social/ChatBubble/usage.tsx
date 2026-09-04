import Stack from '@mui/material/Stack';

import { ChatBubble, type ChatMessage } from './ChatBubble';
import sample from './sample.json';

export function ChatBubbleUsage() {
  const message = sample.message as ChatMessage;

  return (
    <Stack>
      <ChatBubble
        message={message}
        // A retry reuses the original client-generated message id, so a message
        // that actually arrived before the timeout is not delivered twice.
        onRetry={async () => {
          await fetch(`/api/messages/${message.id}/retry`, { method: 'POST' });
        }}
      />
    </Stack>
  );
}
