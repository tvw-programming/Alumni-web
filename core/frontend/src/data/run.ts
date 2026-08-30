import type { Run, RunStep, StepStatus, TaskStatus, Artifact } from '../types/workflow';
import { stepDefinitions } from './steps';
import { payloads } from './payloads';

const JOB = 'DEEP-1042-9d3a7c';
const START = '2026-08-12T08:02:11Z';

/**
 * The run this dashboard opens on.
 *
 * State is chosen so every status has a home: the BRD gate is approved, the
 * build succeeded and passed verification, the security scan then found a
 * committed credential, and the pipeline is now on remediation attempt 2 back
 * at step 12. The merge gate is blocked behind the open findings.
 */
const statuses: Record<number, StepStatus> = {
  1: 'SUCCESS', 2: 'SUCCESS', 3: 'SUCCESS', 4: 'SUCCESS', 5: 'SUCCESS',
  6: 'APPROVED',
  7: 'SUCCESS', 8: 'SUCCESS', 9: 'SUCCESS', 10: 'SUCCESS', 11: 'SUCCESS',
  12: 'RUNNING',
  13: 'SUCCESS', 14: 'SUCCESS', 15: 'SUCCESS',
  16: 'SUCCESS', 17: 'SUCCESS',
  18: 'FAILED',
  19: 'PENDING', 20: 'PENDING', 21: 'PENDING', 22: 'PENDING', 23: 'PENDING',
  24: 'BLOCKED',
};

const durations: Record<number, number> = {
  1: 1840, 2: 9120, 3: 7460, 4: 12880, 5: 18340, 6: 742000, 7: 14210, 8: 21050,
  9: 16780, 10: 19940, 11: 8630, 12: 0, 13: 15120, 14: 24310, 15: 17650,
  16: 6420, 17: 41800, 18: 33900,
};

const models: Record<number, { backend: string; model: string; tin: number; tout: number; cost: number }> = {
  2: { backend: 'paid.anthropic.sonnet', model: 'claude-sonnet-4-6', tin: 1204, tout: 380, cost: 0.0093 },
  3: { backend: 'paid.anthropic.sonnet', model: 'claude-sonnet-4-6', tin: 1710, tout: 296, cost: 0.0095 },
  4: { backend: 'paid.anthropic.sonnet', model: 'claude-sonnet-4-6', tin: 2840, tout: 511, cost: 0.0162 },
  5: { backend: 'paid.anthropic.sonnet', model: 'claude-sonnet-4-6', tin: 3960, tout: 874, cost: 0.0250 },
  7: { backend: 'paid.anthropic.sonnet', model: 'claude-sonnet-4-6', tin: 2210, tout: 640, cost: 0.0162 },
  8: { backend: 'local.ollama.qwen', model: 'qwen2.5-coder:32b', tin: 6120, tout: 742, cost: 0 },
  9: { backend: 'local.ollama.qwen', model: 'qwen2.5-coder:32b', tin: 4380, tout: 396, cost: 0 },
  10: { backend: 'paid.anthropic.sonnet', model: 'claude-sonnet-4-6', tin: 4720, tout: 1104, cost: 0.0307 },
  11: { backend: 'local.ollama.qwen', model: 'qwen2.5-coder:32b', tin: 2180, tout: 388, cost: 0 },
  12: { backend: 'paid.anthropic.sonnet', model: 'claude-sonnet-4-6', tin: 8940, tout: 3120, cost: 0.0736 },
  13: { backend: 'cloud.bedrock.llama', model: 'llama-3.3-70b', tin: 5210, tout: 412, cost: 0.0041 },
  15: { backend: 'paid.anthropic.sonnet', model: 'claude-sonnet-4-6', tin: 6340, tout: 2180, cost: 0.0517 },
};

const artifacts: Record<number, Artifact[]> = {
  1: [{ file: `01_jira_story__${JOB}__v1.json`, ext: 'json', outputClass: 'structured', bytes: 1284, sha256: '4f1c9e2ab7d05836' }],
  2: [{ file: `02_story_analysis__${JOB}__v1.json`, ext: 'json', outputClass: 'structured', bytes: 942, sha256: '81b3d7f0c2a4e916' }],
  3: [{ file: `03_ambiguity_report__${JOB}__v1.json`, ext: 'json', outputClass: 'structured', bytes: 618, sha256: 'c05e97a3b1d84620' }],
  4: [{ file: `04_project_context__${JOB}__v1.md`, ext: 'md', outputClass: 'specification', bytes: 2140, sha256: '7d24b8e0f9c31a55' }],
  5: [
    { file: `05_brd__${JOB}__v1.md`, ext: 'md', outputClass: 'specification', bytes: 3180, sha256: 'bfdb1432adf492ac' },
    { file: `05_brd__${JOB}__v1.pdf`, ext: 'pdf', outputClass: 'document', bytes: 41208, sha256: '2a9f4c81d0e7b365' },
  ],
  6: [{ file: `06_brd_approval__${JOB}__v1.json`, ext: 'json', outputClass: 'structured', bytes: 412, sha256: 'e91c07a4b5d8236f' }],
  7: [{ file: `07_test_design__${JOB}__v1.json`, ext: 'json', outputClass: 'structured', bytes: 1460, sha256: '3f7a2d9e4b81c605' }],
  8: [{ file: `08_repo_understanding__${JOB}__v1.md`, ext: 'md', outputClass: 'specification', bytes: 2760, sha256: '9c14e8b2f5d03a71' }],
  9: [{ file: `09_impact_manifest__${JOB}__v1.json`, ext: 'json', outputClass: 'structured', bytes: 806, sha256: 'd620a4f19b8e35c7' }],
  10: [{ file: `10_feature_spec__${JOB}__v1.md`, ext: 'md', outputClass: 'specification', bytes: 3940, sha256: '58e1c73d9a20f4b6' }],
  11: [{ file: `11_change_plan__${JOB}__v1.json`, ext: 'json', outputClass: 'structured', bytes: 724, sha256: 'a4f80b3e6d17c952' }],
  13: [{ file: `13_requirement_coverage__${JOB}__v1.json`, ext: 'json', outputClass: 'structured', bytes: 512, sha256: '6b0d9f24a8e13c70' }],
  14: [{ file: `14_static_analysis__${JOB}__v1.json`, ext: 'json', outputClass: 'structured', bytes: 1090, sha256: 'f13c85a09d642eb7' }],
  15: [{ file: `15_test_sync__${JOB}__v1.json`, ext: 'json', outputClass: 'structured', bytes: 468, sha256: '2e7b410fd8c39a56' }],
  16: [{ file: `16_unit_test_report__${JOB}__v1.json`, ext: 'json', outputClass: 'structured', bytes: 1340, sha256: 'b8420ce7f1d95a03' }],
  17: [{ file: `17_e2e_report__${JOB}__v1.json`, ext: 'json', outputClass: 'structured', bytes: 980, sha256: '05a9d3f7c284b1e6' }],
  18: [
    { file: `18_sast__${JOB}__v1.json`, ext: 'json', outputClass: 'structured', bytes: 240, sha256: '71fe3b0a9d5c8426' },
    { file: `18_sca__${JOB}__v1.json`, ext: 'json', outputClass: 'structured', bytes: 684, sha256: 'c3a05e91b7d24f68' },
    { file: `18_secrets__${JOB}__v1.json`, ext: 'json', outputClass: 'structured', bytes: 592, sha256: '9d18b46f0e2a7c35' },
    { file: `18_failure__scan__${JOB}__v1.jpg`, ext: 'jpg', outputClass: 'error_snapshot', bytes: 38420, sha256: '4c72e0a8d916b3f5' },
  ],
};

function offset(seconds: number): string {
  return new Date(new Date(START).getTime() + seconds * 1000).toISOString();
}

const startOffsets: Record<number, number> = {
  1: 0, 2: 4, 3: 15, 4: 24, 5: 38, 6: 58, 7: 802, 8: 818, 9: 841, 10: 859,
  11: 881, 12: 891, 13: 1064, 14: 1081, 15: 1107, 16: 1126, 17: 1134, 18: 1177,
};

function buildStep(index: number): RunStep {
  const def = stepDefinitions[index];
  const n = def.step;
  const status = statuses[n];
  const m = models[n];
  const started = startOffsets[n] !== undefined ? offset(startOffsets[n]) : null;

  const step: RunStep = {
    ...def,
    status,
    startedAt: started,
    durationMs: durations[n] ?? null,
    attempt: n === 12 ? 2 : 1,
    // Only step 12 declares an intent today; the rest are read-only or
    // artifact-producing, and a fabricated justification would misrepresent
    // what the pipeline actually records.
    actionIntent:
      n === 12
        ? {
            action: 'apply_patch',
            justification:
              'Change app/services/exporter.py and app/api/users.py to satisfy AC-1, ' +
              'bounded by the step-09 Impact Manifest (2 files, 300 LOC budget).',
            targetFiles: ['app/services/exporter.py', 'app/api/users.py'],
            riskLevel: 'critical',
          }
        : null,
    riskLevel: RISK_BY_STEP[n] ?? 'low',
    // Mirrors what JsonAgentStep declares, with progress consistent with the
    // step's own status — a completed step showing half-done tasks would be a
    // fixture teaching the wrong thing about the component.
    tasks: buildTasks(n, status),
    allowedActions: n === 12 ? ['read', 'create_artifact', 'apply_patch'] : ['read', 'create_artifact'],
    provenance: {
      backendId: m?.backend ?? null,
      modelId: m?.model ?? null,
      promptSha256: m ? `${m.model.slice(0, 4)}9f2c8a01d47b63e5` : null,
      tokensIn: m?.tin ?? 0,
      tokensOut: m?.tout ?? 0,
      costUsd: m?.cost ?? 0,
    },
    artifacts: artifacts[n] ?? [],
    input: payloads[n]?.input ?? null,
    output: payloads[n]?.output ?? null,
  };

  if (n === 6) {
    step.requiredRoles = ['product_owner', 'tech_lead'];
    // The gate writes only its decision; the BRD it gates belongs to step 05.
    step.reviewArtifacts = artifacts[5];
    // Rejecting this gate does not send the run back to step 05 — the same
    // inputs would produce the same BRD. It stops, and a reviewer replaces the
    // document. `required` flips to true the moment Reject is pressed.
    step.revision = {
      enabled: true,
      required: false,
      exhausted: false,
      replacesStep: 5,
      acceptedExtensions: ['md', 'pdf', 'docx'],
      maxBytes: 10 * 1024 * 1024,
      revisionsUsed: 0,
      maxRevisions: 3,
      lastRevision: null,
    };
    step.approval = {
      gate: 'BRD',
      status: 'APPROVED',
      approverId: 'priya.raman',
      approverRole: 'product_owner',
      decidedAt: '2026-08-12T08:14:22Z',
      comment: 'Scope-out list is right. Retention question can be answered in a follow-up ticket.',
      artifactSha256: 'bfdb1432adf492ac5e07d1c9b8a3f6e42d05c8917be3a4f0d2c65b8901ae37f4',
    };
  }

  if (n === 24) {
    step.requiredRoles = ['tech_lead', 'security_owner'];
    step.approval = {
      gate: 'PR',
      status: 'BLOCKED',
      approverId: '',
      approverRole: '',
      decidedAt: null,
      comment: '2 blocking security findings are unresolved',
      artifactSha256: null,
    };
    step.error = {
      code: 'BLOCKED_BY_FINDINGS',
      message: 'Merge approval is unavailable while blocking findings are open',
      detail:
        'Gate 24 has block_if_open_findings enabled. Clear the CRITICAL secret and the HIGH CVE from step 18, or record an explicit override with the security_owner role.',
    };
  }

  if (n === 18) {
    step.error = {
      code: 'BLOCKING_FINDINGS',
      message: '2 findings at or above the blocking severity',
      detail:
        'gitleaks: a signing key is committed at app/services/exporter.py:24 (CRITICAL).\ntrivy: pyjwt 2.4.0 is affected by CVE-2026-21841 (HIGH). Fixed in 2.10.1.',
    };
  }

  return step;
}

/** Mirrors config.steps.NN.risk_level; see docs/11-mutation-inventory.md. */
const RISK_BY_STEP: Record<number, RunStep['riskLevel']> = {
  9: 'medium', 12: 'critical', 13: 'medium', 15: 'high',
  16: 'medium', 17: 'medium', 19: 'medium', 21: 'high', 22: 'high', 23: 'medium',
};

/** The four tasks every agent step declares, in the state its status implies. */
function buildTasks(step: number, status: StepStatus): RunStep['tasks'] {
  const titles = ['Gather inputs', 'Generate with the routed model', 'Validate schema', 'Write artifact'];
  const finished = status === 'SUCCESS' || status === 'APPROVED';
  const activeIndex = status === 'RUNNING' ? 1 : status === 'FAILED' ? 2 : -1;

  return titles.map((title, i): RunStep['tasks'][number] => {
    let taskStatus: TaskStatus = 'pending';
    if (finished || i < activeIndex) taskStatus = 'done';
    else if (i === activeIndex) taskStatus = status === 'FAILED' ? 'failed' : 'running';

    return {
      id: `${String(step).padStart(2, '0')}.${i + 1}`,
      title,
      status: taskStatus,
      detail: null,
      durationMs: finished ? 400 + i * 210 : null,
    };
  });
}

export function buildRun(): Run {
  const steps = stepDefinitions.map((_, i) => buildStep(i));
  const costUsd = Number(steps.reduce((sum, s) => sum + s.provenance.costUsd, 0).toFixed(4));

  return {
    jobId: JOB,
    jiraId: 'DEEP-1042',
    title: 'Allow users to export their own data',
    profile: 'hybrid',
    status: 'RUNNING',
    // Step 18 failed, and a failure blocks everything behind it until a human
    // retries it — so the run names the step it is waiting on.
    blockedAt: 18,
    startedAt: START,
    updatedAt: offset(1211),
    costUsd,
    budgetUsd: 5,
    steps,
    edges: [
      // No 06 -> 05 edge: a rejected BRD is answered with a replacement
      // document, not with another generation pass. See step 06's `revision`.
      { from: 13, on: 'FAILED', to: 12, maxLoops: 3, loopsUsed: 0 },
      { from: 14, on: 'FAILED', to: 12, maxLoops: 3, loopsUsed: 0 },
      { from: 16, on: 'FAILED', to: 12, maxLoops: 4, loopsUsed: 0 },
      { from: 17, on: 'FAILED', to: 12, maxLoops: 3, loopsUsed: 0 },
      { from: 18, on: 'BLOCKING_FINDINGS', to: 12, maxLoops: 2, loopsUsed: 1 },
      { from: 19, on: 'BLOCKING_FINDINGS', to: 12, maxLoops: 2, loopsUsed: 0 },
      { from: 23, on: 'CHANGES_REQUESTED', to: 12, maxLoops: 3, loopsUsed: 0 },
      { from: 24, on: 'REJECTED', to: 12, maxLoops: 5, loopsUsed: 0 },
    ],
  };
}
