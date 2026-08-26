import { payloads } from './payloads';

/**
 * Artifact bodies for the mock transport.
 *
 * The live dashboard reads artifact text from the orchestrator. The mock has no
 * files on disk, so the document artifacts it advertises need bodies here — the
 * artifact viewer is otherwise untestable without a backend.
 *
 * Structured artifacts are not duplicated: their text is the step's output
 * payload, which `payloads.ts` already holds.
 */

const specs: Record<number, string> = {
  4: `# Project context

## Stack
- FastAPI 0.115 on Python 3.12, SQLAlchemy 2.0, Postgres 16
- React 19 + Vite on the web side
- pytest with coverage gate at 80%

## Conventions
- Routers in \`app/api/\`, one module per resource, no business logic
- Services own the transaction boundary; repositories own the query
- Every response model is an explicit pydantic schema

## Relevant prior art
| Area | Where | Note |
| --- | --- | --- |
| Background work | \`app/services/storage.py\` | Existing S3 upload path, reusable for export files |
| AuthZ | \`app/deps.py\` | \`current_user\` dependency already enforces ownership |
`,
  5: `# Business Requirement Document

## Allow users to export their own data

### Background
Signed-in users have no way to take a copy of their profile and order history.
Support currently runs the export by hand, which costs a ticket per request and
puts customer data through a human.

### Objectives
- A user can export their own data without contacting support
- The export is machine-readable and complete enough to be useful on its own

### In scope
- CSV export of profile fields and order history
- Request, ready and failed states surfaced on the account settings page

### Out of scope
- PDF export
- Bulk or admin-initiated export across accounts

### Acceptance criteria
- **AC-1** An authenticated user can request an export of their own data
- **AC-2** The export contains profile and order history as CSV
- **AC-3** A user cannot request an export for another user

### Risks
- The generated file carries PII, so retention and access both need answering

### Assumptions
- Retention period is unresolved and carried as an assumption — see **Q-1**

> Q-1 How long should a generated export stay downloadable before it is purged?
> Raised rather than invented: the pipeline does not guess requirements.
`,
  8: `# Repository understanding

## Entry points
- \`app/main.py\` builds the FastAPI app and mounts \`app/api/users.py\`
- \`app/deps.py\` provides \`current_user\`, the ownership boundary

## Where this change lands
1. \`app/api/users.py\` — a new export endpoint on the existing users router
2. \`app/services/user_service.py\` — assembles the export payload
3. \`app/services/storage.py\` — already uploads files; reuse rather than extend

## What must not move
- \`app/models/user.py\` is consumed by two other services; the schema stays as is
`,
  10: `# Feature specification

## Endpoint
\`POST /users/me/exports\` → \`202 Accepted\`

| Field | Type | Note |
| --- | --- | --- |
| \`export_id\` | uuid | Returned immediately |
| \`status\` | enum | \`requested\` \\| \`ready\` \\| \`failed\` |
| \`download_url\` | string \\| null | Present only when \`ready\` |

## Behaviour
1. The caller is resolved from the session; the path carries no user id, so
   AC-3 holds by construction rather than by a check that can be forgotten.
2. The service writes a CSV per section and uploads it through
   \`storage.put_object\`.
3. Failure is terminal and recorded; the client polls the same resource.

## Traceability
- AC-1 → \`test_export_request_returns_202\`
- AC-2 → \`test_export_contains_profile_and_orders\`
- AC-3 → \`test_export_cannot_target_another_user\`
`,
};

/** The step a filename belongs to, from the `NN_` prefix the store enforces. */
function stepOf(file: string): number | null {
  const match = /^(\d{2})_/.exec(file);
  return match ? Number(match[1]) : null;
}

/**
 * The text of a mock artifact, or null when the artifact is binary — the same
 * distinction the viewer has to make against a real orchestrator.
 */
export function mockArtifactText(file: string): string | null {
  const step = stepOf(file);
  if (step === null) return null;
  const ext = file.split('.').pop() ?? '';

  if (ext === 'md') return specs[step] ?? null;
  if (ext === 'json') {
    const output = payloads[step]?.output;
    return output === undefined ? null : JSON.stringify(output, null, 2);
  }
  return null;
}
