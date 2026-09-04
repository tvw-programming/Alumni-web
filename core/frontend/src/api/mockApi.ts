import type { NewRunRequest, Run, RunStep, StepAction, StepStatus } from '../types/workflow';
import { buildRun } from '../data/run';
import { mockArtifactText } from '../data/artifactText';
import type { VisualVariants } from '../data/visualVariants';
import { FALLBACK_VARIANTS } from '../data/visualVariants';

/**
 * Mock transport.
 *
 * Every function returns a promise and takes the same arguments a real HTTP
 * client would, so replacing this module with `fetch` calls is the only change
 * needed to point the dashboard at a live orchestrator.
 *
 * The run advances a little on each poll, which is what makes a refresh visibly
 * do something rather than redraw identical state.
 */

let current: Run = buildRun();
let tick = 0;

const LATENCY_MS = 260;

function delay<T>(value: T, ms = LATENCY_MS): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function clone(run: Run): Run {
  return structuredClone(run);
}

function setStatus(run: Run, step: number, status: StepStatus): void {
  const target = run.steps.find((s) => s.step === step);
  if (target) target.status = status;
}

function find(run: Run, step: number): RunStep | undefined {
  return run.steps.find((s) => s.step === step);
}

/**
 * Advance the simulated run by one beat.
 *
 * Step 12 is retrying after the security scan flagged a committed credential.
 * Each poll moves that retry forward, then re-runs the downstream checks.
 */
function advance(): void {
  tick += 1;
  const running = current.steps.find((s) => s.status === 'RUNNING');

  if (running) {
    // Let a running step occupy two polls, then complete it.
    const elapsed = (running.durationMs ?? 0) + 60_000;
    running.durationMs = elapsed;
    if (tick % 2 === 0) {
      running.status = 'SUCCESS';
      running.durationMs = elapsed;
      const next = current.steps.find(
        (s) => s.step > running.step && (s.status === 'PENDING' || s.status === 'FAILED'),
      );
      if (next && next.status !== 'BLOCKED') {
        next.status = 'RUNNING';
        next.startedAt = new Date().toISOString();
        next.durationMs = 0;
        next.attempt += 1;
      }
    }
  }

  // Once the security scan clears, the merge gate stops being blocked.
  const scan = find(current, 18);
  if (scan && scan.status === 'SUCCESS') {
    const gate = find(current, 24);
    if (gate && gate.status === 'BLOCKED') {
      gate.status = 'AWAITING_APPROVAL';
      gate.error = undefined;
      if (gate.approval) gate.approval.status = 'PENDING';
      gate.approval = {
        gate: 'PR',
        status: 'PENDING',
        approverId: '',
        approverRole: '',
        decidedAt: null,
        comment: '',
        artifactSha256: '035785d4b86ff93f1c2e0a749db6835fc41e9027ad58b3106fe2c94d817ab6e0',
      };
    }
  }

  current.costUsd = Number(
    current.steps.reduce((sum, s) => sum + s.provenance.costUsd, 0).toFixed(4),
  );
  current.updatedAt = new Date().toISOString();
  current.status = current.steps.some((s) => s.status === 'FAILED')
    ? 'HALTED'
    : current.steps.some((s) => s.status === 'AWAITING_APPROVAL')
      ? 'AWAITING_APPROVAL'
      : current.steps.every((s) => s.status === 'SUCCESS' || s.status === 'APPROVED')
        ? 'COMPLETED'
        : 'RUNNING';
}

export function fetchRun(): Promise<Run> {
  advance();
  return delay(clone(current));
}

/** Read the run without advancing it — used for the first paint. */
export function peekRun(): Run {
  return clone(current);
}

export interface ActionResult {
  run: Run;
  message: string;
  /** Things the orchestrator noticed about an uploaded document but accepted. */
  warnings?: string[];
}

export interface RevisionUpload {
  filename: string;
  contentBase64: string;
  uploadedBy: string;
  uploadedRole: string;
  comment?: string;
}

export function submitAction(
  step: number,
  action: StepAction,
  options: { comment?: string; role?: string; approver?: string } = {},
): Promise<ActionResult> {
  const target = find(current, step);
  if (!target) return Promise.reject(new Error(`No step ${step} in this run`));

  const now = new Date().toISOString();
  const approver = options.approver ?? 'you';
  const role = options.role ?? target.requiredRoles?.[0] ?? 'reviewer';
  let message = '';

  if (action === 'approve') {
    target.status = 'APPROVED';
    target.approval = {
      gate: target.step === 6 ? 'BRD' : 'PR',
      status: 'APPROVED',
      approverId: approver,
      approverRole: role,
      decidedAt: now,
      comment: options.comment ?? '',
      artifactSha256: target.approval?.artifactSha256 ?? null,
    };
    const next = current.steps.find((s) => s.step > step && s.status === 'PENDING');
    if (next) {
      next.status = 'RUNNING';
      next.startedAt = now;
      next.durationMs = 0;
    }
    message = `Step ${String(step).padStart(2, '0')} approved. The run continues.`;
  }

  if (action === 'reject') {
    target.status = 'REJECTED';
    target.approval = {
      gate: target.step === 6 ? 'BRD' : 'PR',
      status: 'REJECTED',
      approverId: approver,
      approverRole: role,
      decidedAt: now,
      comment: options.comment ?? '',
      artifactSha256: target.approval?.artifactSha256 ?? null,
    };

    // A gate that accepts a replacement document does not send the run
    // backwards: the same inputs would produce the same document. It stops and
    // waits for a person to supply a different one.
    if (target.revision?.enabled) {
      target.revision = {
        ...target.revision,
        required: target.revision.revisionsUsed < target.revision.maxRevisions,
        exhausted: target.revision.revisionsUsed >= target.revision.maxRevisions,
      };
      message = `Step ${String(step).padStart(2, '0')} rejected. The run stops here until you supply a replacement document.`;
    } else {
      const edge = current.edges.find((e) => e.from === step && e.on === 'REJECTED');
      if (edge) {
        edge.loopsUsed += 1;
        setStatus(current, edge.to, 'RUNNING');
        const back = find(current, edge.to);
        if (back) {
          back.startedAt = now;
          back.durationMs = 0;
          back.attempt += 1;
        }
        message = `Step ${String(step).padStart(2, '0')} rejected. Sent back to step ${String(edge.to).padStart(2, '0')}.`;
      } else {
        message = `Step ${String(step).padStart(2, '0')} rejected. The run is halted.`;
      }
    }
  }

  if (action === 'retry') {
    if (target.status !== 'FAILED' && target.status !== 'STALLED') {
      return Promise.reject(
        new Error(
          `Step ${step} is ${target.status.replace('_', ' ').toLowerCase()}, not failed or stalled. ` +
            'Retry re-runs a step that failed or stalled; there is nothing here to resolve.',
        ),
      );
    }
    target.status = 'RUNNING';
    target.startedAt = now;
    target.durationMs = 0;
    target.attempt += 1;
    target.error = undefined;
    current.blockedAt = null;
    message = `Step ${String(step).padStart(2, '0')} is running again from the beginning — attempt ${target.attempt}.`;
  }

  current.updatedAt = now;
  return delay({ run: clone(current), message });
}

/**
 * Replace the document a gate rejected.
 *
 * The mock enforces the two rules that matter to the interaction: a document is
 * only accepted while the gate stands rejected, and it has to look like the
 * document it replaces. Everything else — checksums, supersession, the audit
 * record — is simulated closely enough that the offline demo and the live
 * dashboard behave the same way.
 */
export function submitRevision(step: number, upload: RevisionUpload): Promise<ActionResult> {
  const target = find(current, step);
  if (!target) return Promise.reject(new Error(`No step ${step} in this run`));

  const revision = target.revision;
  if (!revision?.enabled) {
    return Promise.reject(new Error(`Gate ${step} does not accept a replacement document`));
  }
  if (revision.exhausted) {
    return Promise.reject(
      new Error(
        `Gate ${step} has already been answered with ${revision.revisionsUsed} replacement ` +
          'documents, the configured limit. The run needs a decision or an escalation.',
      ),
    );
  }
  if (!revision.required) {
    return Promise.reject(
      new Error(
        `Gate ${step} is not waiting for a replacement document. A document is only accepted ` +
          'while the gate stands rejected.',
      ),
    );
  }

  const text = atob(upload.contentBase64);
  if (!/acceptance criteria/i.test(text)) {
    return Promise.reject(
      new Error(
        'the document has no acceptance criteria. Every downstream step traces to them, so a ' +
          'BRD without an `### Acceptance Criteria` section cannot replace one that has them.',
      ),
    );
  }

  const now = new Date().toISOString();
  const replaced = find(current, revision.replacesStep);
  const sha = `${Date.now().toString(16)}${'0'.repeat(16)}`.slice(0, 64);
  const file = `${String(revision.replacesStep).padStart(2, '0')}_brd__revised__${current.jobId}__v${revision.revisionsUsed + 1}.md`;
  const fresh = {
    file,
    ext: 'md',
    outputClass: 'specification' as const,
    bytes: text.length,
    sha256: sha,
    superseded: false,
    source: 'human_upload',
  };

  if (replaced) {
    replaced.artifacts = [
      ...replaced.artifacts.map((a) => ({ ...a, superseded: true })),
      fresh,
    ];
  }

  target.reviewArtifacts = [fresh];
  target.status = 'AWAITING_APPROVAL';
  target.revision = {
    ...revision,
    required: false,
    exhausted: false,
    revisionsUsed: revision.revisionsUsed + 1,
    lastRevision: {
      file,
      sha256: sha,
      uploadedBy: upload.uploadedBy,
      uploadedRole: upload.uploadedRole,
      at: now,
      warnings: [],
    },
  };
  if (target.approval) target.approval = { ...target.approval, supersededByRevision: true };

  current.status = 'AWAITING_APPROVAL';
  current.updatedAt = now;
  return delay({
    run: clone(current),
    message: `${file} replaced the step ${String(revision.replacesStep).padStart(2, '0')} document. Gate ${String(step).padStart(2, '0')} is open again and bound to its checksum.`,
    warnings: [],
  });
}

/**
 * Mock: clear NEEDS_INPUT by marking the step successful and advancing.
 * Live mode writes story_input and resumes via the watcher.
 */
export function submitClarification(
  step: number,
  answers: { id: string; answer: string }[],
  _answeredBy: string,
): Promise<ActionResult> {
  const target = find(current, step);
  if (!target) return Promise.reject(new Error(`No step ${step} in this run`));
  if (target.status !== 'NEEDS_INPUT') {
    return Promise.reject(new Error(`Step ${step} is not waiting on answers`));
  }
  const needed = target.blockingQuestions ?? [];
  const byId = Object.fromEntries(answers.map((a) => [a.id, a.answer.trim()]));
  const missing = needed.filter((q) => !byId[q.id]);
  if (missing.length > 0) {
    return Promise.reject(
      new Error(
        `Every blocking question needs an answer. Still empty: ${missing.map((q) => q.id).join(', ')}`,
      ),
    );
  }

  const now = new Date().toISOString();
  target.status = 'SUCCESS';
  target.blockingQuestions = undefined;
  target.error = undefined;
  const next = current.steps.find((s) => s.step > step && s.status === 'PENDING');
  if (next) {
    next.status = 'RUNNING';
    next.startedAt = now;
    next.durationMs = 0;
  }
  current.status = 'RUNNING';
  current.blockedAt = null;
  current.updatedAt = now;

  return delay({
    run: clone(current),
    message: `Recorded answers for ${answers.map((a) => a.id).join(', ')}. The run continues.`,
  });
}

export function rerunFromStep(step: number): Promise<ActionResult> {
  return submitAction(step, 'retry');
}

/**
 * Start a run at step 01.
 *
 * The mock builds a run that has genuinely just begun — step 01 running, the
 * rest pending — from the story the developer typed, so the offline demo shows
 * the same first minute the live stack does.
 */
export function startRun(body: NewRunRequest): Promise<{ jobId: string; run: Run; message: string }> {
  const now = new Date().toISOString();
  const jobId = `${body.jiraId}-${Math.random().toString(16).slice(2, 8)}`;
  const fresh = buildRun();

  current = {
    ...fresh,
    jobId,
    jiraId: body.jiraId,
    title: body.title || body.jiraId,
    status: 'RUNNING',
    blockedAt: null,
    startedAt: now,
    updatedAt: now,
    costUsd: 0,
    steps: fresh.steps.map((s) => ({
      ...s,
      status: s.step === 1 ? ('RUNNING' as const) : ('PENDING' as const),
      startedAt: s.step === 1 ? now : null,
      durationMs: s.step === 1 ? 0 : null,
      attempt: 1,
      error: undefined,
      approval: undefined,
      artifacts: [],
      output: null,
      provenance: { ...s.provenance, tokensIn: 0, tokensOut: 0, costUsd: 0 },
    })),
    edges: fresh.edges.map((e) => ({ ...e, loopsUsed: 0 })),
  };
  tick = 0;

  return delay({
    jobId,
    run: clone(current),
    message: `Run ${jobId} starting at step 01 from ${
      body.useTracker ? 'the configured tracker' : 'the details you entered'
    }.`,
  });
}

export function fetchArtifactText(file: string): Promise<string> {
  const text = mockArtifactText(file);
  if (text === null) {
    return Promise.reject(new Error(`${file} has no text body in the mock transport`));
  }
  return delay(text);
}

/**
 * The mock has no files to link to, so binary artifacts cannot be previewed or
 * downloaded here. Returning null lets the viewer say that rather than offer a
 * link that would 404.
 */
export function artifactUrl(_file: string): Promise<string | null> {
  return Promise.resolve(null);
}

/** The mock mirrors the variants config.json ships; there is nothing to fetch. */
export function fetchVisualVariants(): Promise<VisualVariants> {
  return delay(FALLBACK_VARIANTS);
}

/**
 * Product UI the pipeline is changing — Alumni sample at :5174 by default.
 * Mock mode still exposes the link so the dashboard chrome matches live mode.
 */
export function fetchProjectUi(): Promise<{ url: string; label: string } | null> {
  return delay({
    url: 'http://localhost:5174',
    label: 'Product UI',
  });
}

/** Test seam: put the simulation back to its opening state. */
export function resetRun(): void {
  current = buildRun();
  tick = 0;
}
