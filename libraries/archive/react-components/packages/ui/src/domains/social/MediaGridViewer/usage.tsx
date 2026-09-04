import { MediaGridViewer } from './MediaGridViewer';
import sample from './sample.json';

import type { MediaAsset } from '../PostCard/PostCard';

export function MediaGridViewerUsage() {
  // Every asset carries alt text — the type requires it, so a post cannot be
  // published without one.
  return <MediaGridViewer media={sample.media as MediaAsset[]} maxTiles={4} />;
}
