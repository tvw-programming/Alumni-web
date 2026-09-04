import sample from './sample.json';
import { SceneCard, type Scene, type SceneRunResult } from './SceneCard';

export function SceneCardUsage() {
  const scene = sample.scene as Scene;

  return (
    <SceneCard
      scene={scene}
      // Returns per-device results. Partial failure is the normal case for a
      // scene, so the API reports it rather than a boolean.
      onRun={async (): Promise<SceneRunResult> => {
        const response = await fetch(`/api/scenes/${scene.id}/run`, { method: 'POST' });
        if (!response.ok) throw await response.json();
        return (await response.json()) as SceneRunResult;
      }}
    />
  );
}
