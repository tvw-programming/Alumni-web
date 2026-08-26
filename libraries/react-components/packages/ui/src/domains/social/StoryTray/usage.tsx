import sample from './sample.json';
import { StoryTray } from './StoryTray';

export function StoryTrayUsage() {
  return (
    <StoryTray
      stories={sample.stories}
      onOpen={() => {
        /* open the story viewer */
      }}
      onAddStory={() => {
        /* open the camera */
      }}
    />
  );
}
