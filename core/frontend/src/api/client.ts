import * as http from './httpApi';
import * as mock from './mockApi';

/**
 * Transport selection.
 *
 * Set `VITE_API_BASE` and the dashboard talks to a running orchestrator.
 * Leave it unset and it runs on the built-in mock, which is what makes the
 * project usable straight after `npm install` with no backend at all.
 */
export const isLive = Boolean(import.meta.env.VITE_API_BASE);

const api = isLive ? http : mock;

export const fetchRun = api.fetchRun;
export const submitAction = api.submitAction;
export const submitRevision = api.submitRevision;
export const rerunFromStep = api.rerunFromStep;
export const startRun = api.startRun;
export const fetchArtifactText = api.fetchArtifactText;
export const artifactUrl: (file: string) => Promise<string | null> = api.artifactUrl;
export const fetchVisualVariants = api.fetchVisualVariants;

/** Only the mock can answer synchronously; live mode paints from the first poll. */
export const peekRun = isLive ? null : mock.peekRun;

export type { ActionResult, RevisionUpload } from './mockApi';
