import List from '@mui/material/List';

import { ConversationListItem, type Conversation } from './ConversationListItem';
import sample from './sample.json';

export function ConversationListItemUsage() {
  const conversation = sample.conversation as Conversation;
  return (
    <List disablePadding>
      <ConversationListItem
        conversation={conversation}
        onPress={() => {
          /* open the thread */
        }}
      />
    </List>
  );
}
