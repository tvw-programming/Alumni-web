import type { NewRunRequest, Run, StepAction } from '../types/workflow';
import type { VisualVariants } from '../data/visualVariants';
import { FALLBACK_VARIANTS } from '../data/visualVariants';
import type { ActionResult, RevisionUpload } from './mockApi';

/**
 * Live transport.
 *
 * Talks to the FastAPI surface in `codegen_core.dashboard.api`, which reconstructs
 * every field from the run journal and the artifact index. Same signatures as
 * the mock, so `client.ts` can pick between them without any caller changing.
 */

const BASE = (import.meta.env.VITE_API_BASE ?? '').replace(/\/$/, '');
const JOB = import.meta.env.VITE_JOB_ID ?? '';

class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function send(path: string, init?: RequestInit): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    });
  } catch {
    throw new ApiError(`Cannot reach the orchestrator at ${BASE}. Is it running?`, 0);
  }

  if (!response.ok) {
    const detail = await response
      .json()
      .then((body: { detail?: string }) => body.detail)
      .catch(() => null);
    throw new ApiError(detail ?? `${path} returned ${response.status}`, response.status);
  }
  return response;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  return (await send(path, init)).json() as Promise<T>;
}

/** Which run to show. Falls back to the newest one on the server. */
async function resolveJobId(): Promise<string> {
  if (JOB) return JOB;
  const runs = await request<{ jobId: string }[]>('/api/runs');
  if (runs.length === 0) {
    throw new ApiError('No runs found. Start one with `codegen-core run <JIRA-ID>`.', 404);
  }
  return runs[0].jobId;
}

let cachedJobId: string | null = null;

async function jobId(): Promise<string> {
  cachedJobId ??= await resolveJobId();
  return cachedJobId;
}

export async function fetchRun(): Promise<Run> {
  return request<Run>(`/api/runs/${await jobId()}`);
}

export async function submitAction(
  step: number,
  action: StepAction,
  options: { comment?: string; role?: string; approver?: string } = {},
): Promise<ActionResult> {
  const id = await jobId();

  if (action === 'retry') {
    return request<ActionResult>(`/api/runs/${id}/steps/${step}/retry`, {
      method: 'POST',
      body: JSON.stringify({ requestedBy: options.approver ?? 'dashboard-user' }),
    });
  }

  // `rerun` at a rejected gate is the document upload, which goes through
  // submitRevision; it never reaches here.
  if (action === 'rerun') {
    throw new ApiError('A rejected gate is answered with a document, not a rerun.', 400);
  }

  // The role decides whether the gate accepts the decision at all, and it is
  // recorded in the audit trail, so it comes from the gate's own requiredRoles
  // rather than from a default here. A wrong guess is a 403 the reviewer cannot
  // act on; no guess at all is a bug worth saying out loud.
  if (!options.role) {
    throw new ApiError(
      'No role was given for this decision. A gate records who decided, so the dashboard cannot approve without one.',
      400,
    );
  }

  return request<ActionResult>(`/api/runs/${id}/steps/${step}/decision`, {
    method: 'POST',
    body: JSON.stringify({
      status: action === 'approve' ? 'APPROVED' : 'REJECTED',
      approverId: options.approver ?? 'dashboard-user',
      approverRole: options.role,
      comment: options.comment ?? '',
    }),
  });
}

/** Retry whichever step the run is blocked on. */
export async function rerunFromStep(step: number): Promise<ActionResult> {
  return submitAction(step, 'retry');
}

/**
 * Start a run at step 01.
 *
 * The only way the dashboard begins a pipeline — nothing schedules one, and
 * the container no longer seeds one at boot. The response carries the new job
 * id, which the client pins so the dashboard follows the run it just started
 * rather than whatever happens to be newest.
 */
export async function startRun(body: NewRunRequest): Promise<{ jobId: string; run: Run; message: string }> {
  const created = await request<{ jobId: string; run: Run; message: string }>('/api/runs', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  cachedJobId = created.jobId;
  return created;
}

/**
 * Replace the document a gate rejected.
 *
 * The bytes go up base64-encoded in a JSON body, which is what the orchestrator
 * accepts: one document per decision rather than a stream, and no multipart
 * dependency on either side. The response is the whole run, so the gate comes
 * back re-opened against the new checksum in the same round trip.
 */
export async function submitRevision(
  step: number,
  upload: RevisionUpload,
): Promise<ActionResult> {
  const id = await jobId();
  return request<ActionResult>(`/api/runs/${id}/steps/${step}/revision`, {
    method: 'POST',
    body: JSON.stringify({
      filename: upload.filename,
      contentBase64: upload.contentBase64,
      uploadedBy: upload.uploadedBy,
      uploadedRole: upload.uploadedRole,
      comment: upload.comment ?? '',
    }),
  });
}

/**
 * The text of one artifact.
 *
 * The orchestrator serves `.md`, `.json` and `.diff` as plain text from the
 * same file the checksum was taken over, so what a reviewer reads here is the
 * artifact itself rather than a copy of it held in the dashboard.
 */
export async function fetchArtifactText(file: string): Promise<string> {
  const id = await jobId();
  return (await send(`/api/runs/${id}/artifacts/${encodeURIComponent(file)}`)).text();
}

/** A URL the browser can load directly — for PDFs, images and downloads. */
export async function artifactUrl(file: string): Promise<string> {
  const id = await jobId();
  return `${BASE}/api/runs/${id}/artifacts/${encodeURIComponent(file)}`;
}

/**
 * The visualisation variants defined in config.json.
 *
 * An orchestrator older than this endpoint answers 404; the dashboard then
 * draws with its built-in copy rather than losing the Visual tab entirely.
 */
export async function fetchVisualVariants(): Promise<VisualVariants> {
  try {
    return await request<VisualVariants>('/api/visual/variants');
  } catch {
    return FALLBACK_VARIANTS;
  }
}

export async function health(): Promise<{
  ok: boolean;
  profile: string;
  steps: number;
  projectUi?: { url: string; label: string } | null;
}> {
  return request('/api/health');
}
