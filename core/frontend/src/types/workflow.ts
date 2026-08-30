/**
 * Domain types for a CodeGen Core pipeline run.
 *
 * These mirror the artifact contracts the backend emits, so swapping the mock
 * API for a real one is a change of transport, not a change of shape.
 */

export type StepStatus =
  | 'SUCCESS'
  | 'RUNNING'
  | 'FAILED'
  | 'PENDING'
  | 'BLOCKED'
  | 'AWAITING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'SKIPPED';

/** A step is not necessarily an agent — the kind tells you whether it costs money. */
export type ComponentKind = 'AGENT' | 'TOOL' | 'PLUGIN' | 'GATE';

export type Capability = 'fast' | 'coding' | 'reasoning' | 'security' | 'vision';

export type PhaseId =
  | 'requirements'
  | 'gate-brd'
  | 'design'
  | 'build'
  | 'validate'
  | 'publish'
  | 'gate-merge';

export interface Phase {
  id: PhaseId;
  label: string;
  steps: number[];
}

/** Static definition of a step — the parts that do not change between runs. */
export interface StepDefinition {
  step: number;
  name: string;
  title: string;
  category: string;
  kind: ComponentKind;
  phase: PhaseId;
  capability?: Capability;
  consumes: string[];
  produces: string[];
  /** Why this step is this component kind rather than another. */
  rationale: string;
}

export interface Artifact {
  file: string;
  ext: string;
  outputClass: 'structured' | 'document' | 'error_snapshot' | 'specification';
  bytes: number;
  sha256: string;
  /**
   * A newer artifact replaced this one. Nothing is deleted — an auditor has to
   * see what the run used to hold — but a reviewer must not mistake a replaced
   * document for the one under review.
   */
  superseded?: boolean;
  /** `pipeline` for anything a step wrote, `human_upload` for a replacement. */
  source?: string;
}

export interface Provenance {
  backendId: string | null;
  modelId: string | null;
  promptSha256: string | null;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
}

export interface Approval {
  gate: string;
  status: 'APPROVED' | 'REJECTED' | 'BLOCKED' | 'PENDING';
  approverId: string;
  approverRole: string;
  decidedAt: string | null;
  comment: string;
  artifactSha256: string | null;
  /** Recorded but no longer current: a replacement document arrived after it. */
  supersededByRevision?: boolean;
}

/**
 * The way forward from a rejection.
 *
 * A rejected gate has no remediation edge — re-running the step that wrote the
 * document produces the same document from the same inputs. What moves the run
 * on is a different document, supplied by the person who rejected the first
 * one. `required` is true exactly while the gate is waiting for it, which is
 * what replaces Approve/Reject with a single control in every view.
 */
export interface GateRevision {
  enabled: boolean;
  required: boolean;
  /** The replacement budget is spent; the run needs an escalation, not a draft. */
  exhausted: boolean;
  /** Whose artifact the upload replaces — a gate writes only its own decision. */
  replacesStep: number;
  acceptedExtensions: string[];
  maxBytes: number;
  revisionsUsed: number;
  maxRevisions: number;
  lastRevision: {
    file: string;
    sha256: string;
    uploadedBy: string;
    uploadedRole: string;
    at: string;
    warnings: string[];
  } | null;
}

/**
 * Why a step acted, declared before it acted.
 *
 * Provenance answers which model produced an artifact; this answers why these
 * files. Null until the step declares one — a step that failed before
 * declaring has none, which is itself informative.
 */
export interface ActionIntent {
  action: string;
  justification: string;
  targetFiles: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export type TaskStatus = 'pending' | 'running' | 'done' | 'failed' | 'skipped';

/**
 * One unit of work inside a step.
 *
 * A step is what the pipeline resumes from; a task is what a person watches.
 * Between "step 12 running" and "step 12 finished" there is a minute of nothing
 * otherwise.
 */
export interface StepTask {
  id: string;
  title: string;
  status: TaskStatus;
  detail: string | null;
  durationMs: number | null;
}

/** Live state of one step within a run. */
export interface RunStep extends StepDefinition {
  status: StepStatus;
  startedAt: string | null;
  durationMs: number | null;
  attempt: number;
  provenance: Provenance;
  /** Why the step acted, declared before it did. Null until it declares one. */
  actionIntent: ActionIntent | null;
  /** Declared upfront, so the checklist is whole from the start. */
  tasks: StepTask[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  allowedActions: string[];
  artifacts: Artifact[];
  input: unknown;
  output: unknown;
  /** Present when status is FAILED or BLOCKED. */
  error?: { code: string; message: string; detail?: string };
  /** Set on gate steps only. */
  approval?: Approval;
  requiredRoles?: string[];
  /** Gate steps only, and only where the gate accepts a replacement document. */
  revision?: GateRevision;
  /**
   * Gate steps only: the artifacts the gate was opened against. A gate writes
   * only its own decision, so this is the document the reviewer is deciding on.
   */
  reviewArtifacts?: Artifact[];
}

export interface RemediationEdge {
  from: number;
  on: string;
  to: number;
  maxLoops: number;
  loopsUsed: number;
}

export interface Run {
  jobId: string;
  jiraId: string;
  title: string;
  profile: string;
  status: 'RUNNING' | 'HALTED' | 'COMPLETED' | 'AWAITING_APPROVAL';
  /**
   * The step holding the run up, if one is. A failed step blocks everything
   * behind it until a human resolves it, so the run names it rather than
   * leaving a reader to find the red row among twenty-four.
   */
  blockedAt: number | null;
  startedAt: string;
  updatedAt: string;
  costUsd: number;
  budgetUsd: number;
  steps: RunStep[];
  edges: RemediationEdge[];
}

/**
 * What a person can do to one step.
 *
 * `retry` and `rerun` are different things and the distinction is the point:
 * retry re-executes a step that *failed*, and rerun is the way past a gate that
 * was *rejected* — which is not a re-execution at all, but a prompt for the
 * replacement document the gate is waiting for.
 */
export type StepAction = 'approve' | 'reject' | 'retry' | 'rerun';

/** The story a developer types in to start a run at step 01. */
export interface NewRunRequest {
  jiraId: string;
  title: string;
  description: string;
  acceptanceCriteria: string[];
  /** Skip the form: step 01 reads the tracker configured in config.json. */
  useTracker: boolean;
  startedBy: string;
}

export interface DocNode {
  id: string;
  label: string;
  /** Absent on group nodes. */
  content?: string;
  children?: DocNode[];
}
