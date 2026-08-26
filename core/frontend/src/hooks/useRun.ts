import { useCallback, useEffect, useRef, useState } from 'react';
import type { NewRunRequest, Run, StepAction } from '../types/workflow';
import {
  fetchRun,
  isLive,
  peekRun,
  rerunFromStep,
  startRun,
  submitAction,
  submitRevision,
} from '../api/client';
import type { RevisionUpload } from '../api/client';

export const REFRESH_INTERVAL_MS = 120_000;

interface UseRunResult {
  /** Null until the first poll lands when talking to a live orchestrator. */
  run: Run | null;
  loading: boolean;
  error: string | null;
  /** Seconds until the next automatic refresh. */
  secondsUntilRefresh: number;
  autoRefresh: boolean;
  setAutoRefresh: (on: boolean) => void;
  refresh: () => Promise<void>;
  act: (step: number, action: StepAction, options?: DecisionOptions) => Promise<string>;
  rerunFrom: (step: number) => Promise<string>;
  /** Replace the document a gate rejected; the gate re-opens against it. */
  revise: (step: number, upload: RevisionUpload) => Promise<RevisionResult>;
  /** Begin a run at step 01. Nothing else starts one. */
  start: (request: NewRunRequest) => Promise<string>;
  /** No run exists yet — not a failure, just nothing started. */
  empty: boolean;
}

export interface RevisionResult {
  message: string;
  /** Accepted, but with something the uploader should know — renumbered ids, say. */
  warnings: string[];
}

/**
 * Who is deciding, and as what.
 *
 * `role` is not cosmetic: the orchestrator refuses a decision from a role the
 * gate does not list, and records the one it accepts against the artifact
 * checksum. It has to travel from the gate that declared it to the request.
 */
export interface DecisionOptions {
  comment?: string;
  role?: string;
  approver?: string;
}

/**
 * Polls the run on REFRESH_INTERVAL_MS and exposes a countdown so the refresh is
 * something the reader can see coming rather than a surprise repaint. Nothing
 * here assumes the interval's length; the indicator formats whatever it is.
 */
export function useRun(): UseRunResult {
  // The mock can paint immediately; a live backend cannot, so we start empty
  // and let the first poll fill it in.
  const [run, setRun] = useState<Run | null>(() => (peekRun ? peekRun() : null));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [empty, setEmpty] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState(REFRESH_INTERVAL_MS / 1000);
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    try {
      const next = await fetchRun();
      setRun(next);
      setError(null);
      setEmpty(false);
    } catch (err) {
      // "Nothing has been started yet" is the normal state of a fresh stack,
      // not a fault: the pipeline waits for a developer. Showing it as an error
      // would tell someone to fix something that is working as designed.
      const missing = (err as { status?: number })?.status === 404;
      setEmpty(missing);
      setError(missing ? null : err instanceof Error ? err.message : 'The run could not be loaded.');
    } finally {
      inFlight.current = false;
      setLoading(false);
      setSecondsUntilRefresh(REFRESH_INTERVAL_MS / 1000);
    }
  }, []);

  // In live mode nothing is on screen until the first fetch returns.
  useEffect(() => {
    if (isLive) void refresh();
  }, [refresh]);

  // Countdown drives the refresh, so pausing the countdown pauses polling.
  useEffect(() => {
    if (!autoRefresh) return;
    const id = window.setInterval(() => {
      setSecondsUntilRefresh((s) => {
        if (s <= 1) {
          void refresh();
          return REFRESH_INTERVAL_MS / 1000;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [autoRefresh, refresh]);

  const act = useCallback(
    async (step: number, action: StepAction, options?: DecisionOptions) => {
      setLoading(true);
      try {
        const result = await submitAction(step, action, options);
        setRun(result.run);
        setError(null);
        setSecondsUntilRefresh(REFRESH_INTERVAL_MS / 1000);
        return result.message;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'That action could not be completed.';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const revise = useCallback(async (step: number, upload: RevisionUpload) => {
    setLoading(true);
    try {
      const result = await submitRevision(step, upload);
      // The response carries the whole run, so the gate is already showing as
      // re-opened against the new document by the time the dialog closes.
      setRun(result.run);
      setError(null);
      setSecondsUntilRefresh(REFRESH_INTERVAL_MS / 1000);
      return { message: result.message, warnings: result.warnings ?? [] };
    } catch (err) {
      // Deliberately not stored in `error`: an upload the gate refused is the
      // uploader's problem to fix in the dialog they are still looking at, not
      // a banner across the run.
      throw err instanceof Error ? err : new Error('That document could not be accepted.');
    } finally {
      setLoading(false);
    }
  }, []);

  const start = useCallback(async (request: NewRunRequest) => {
    setLoading(true);
    try {
      const created = await startRun(request);
      setRun(created.run);
      setEmpty(false);
      setError(null);
      setSecondsUntilRefresh(REFRESH_INTERVAL_MS / 1000);
      return created.message;
    } catch (err) {
      // Surfaced in the dialog the developer is still looking at, not as a
      // banner over an empty page.
      throw err instanceof Error ? err : new Error('That run could not be started.');
    } finally {
      setLoading(false);
    }
  }, []);

  const rerunFrom = useCallback(async (step: number) => {
    setLoading(true);
    try {
      const result = await rerunFromStep(step);
      setRun(result.run);
      setError(null);
      return result.message;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    run,
    loading,
    error,
    secondsUntilRefresh,
    autoRefresh,
    setAutoRefresh,
    refresh,
    act,
    rerunFrom,
    revise,
    start,
    empty,
  };
}
