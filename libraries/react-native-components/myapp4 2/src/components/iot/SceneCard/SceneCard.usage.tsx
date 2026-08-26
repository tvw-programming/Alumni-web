import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Text } from 'react-native-paper';

import { useAppTheme } from '@/theme';

import { SceneCard } from './SceneCard';
import sample from './SceneCard.sample.json';
import { loadSample } from '../types/sample';
import type { SceneExecution, SmartScene } from '../types/domain';

const DATA = loadSample<{ scenes: SmartScene[]; executions: Record<string, SceneExecution> }>(sample);

export const SceneCardUsage = () => {
  const theme = useAppTheme();
  const [executions, setExecutions] = useState<Record<string, SceneExecution>>({});

  const runScene = (scene: SmartScene) => {
    setExecutions((prev) => ({ ...prev, [scene.id]: { status: 'running' } }));
    setTimeout(() => {
      const result = DATA.executions[scene.id] ?? { status: 'success' as const };
      setExecutions((prev) => ({ ...prev, [scene.id]: result }));
    }, 1400);
  };

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.sm }}>
      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
        "Movie Time" simulates a partial failure — one device didn't respond.
      </Text>
      {DATA.scenes.map((scene) => (
        <View key={scene.id}>
          <SceneCard scene={scene} execution={executions[scene.id]} onRun={runScene} onEdit={() => {}} onTest={() => {}} onMore={() => {}} />
        </View>
      ))}
    </ScrollView>
  );
};
