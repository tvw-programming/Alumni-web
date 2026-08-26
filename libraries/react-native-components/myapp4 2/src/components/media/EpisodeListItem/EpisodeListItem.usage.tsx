/**
 * USAGE — EpisodeListItem
 *
 * Play and Download are separate tap targets on every row — tapping the
 * thumbnail never accidentally starts a download, and vice versa.
 */
import React, { useState } from 'react';
import { ScrollView } from 'react-native';
import { Divider } from 'react-native-paper';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { Episode } from '../types/domain';
import { EpisodeListItem } from './EpisodeListItem';
import sample from './EpisodeListItem.sample.json';

const { episodes: initial } = loadSample<{ episodes: Episode[] }>(sample);

export const EpisodeListItemUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const [episodes, setEpisodes] = useState(initial);

  const update = (id: string, patch: Partial<Episode>) => setEpisodes((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, backgroundColor: '#0B0B0F' }}>
      {episodes.map((episode, index) => (
        <React.Fragment key={episode.id}>
          <EpisodeListItem
            episode={episode}
            onPlay={(item) => toast.show(`Playing episode ${item.episodeNumber}`)}
            onDownload={(item) => update(item.id, { downloadState: 'downloading', downloadProgress: 0.1 })}
            onPauseDownload={(item) => update(item.id, { downloadState: 'paused' })}
            onResumeDownload={(item) => update(item.id, { downloadState: 'downloading' })}
            onRemoveDownload={(item) => update(item.id, { downloadState: 'idle' })}
            onRetryDownload={(item) => update(item.id, { downloadState: 'downloading', downloadProgress: 0.1 })}
            onMore={(item) => toast.show(`Options for episode ${item.episodeNumber}`)}
          />
          {index < episodes.length - 1 ? <Divider /> : null}
        </React.Fragment>
      ))}
    </ScrollView>
  );
};
