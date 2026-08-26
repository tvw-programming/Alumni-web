/**
 * Input and output payloads per step.
 *
 * These are what the inspection dialog exists to show, so they are genuinely
 * different per step rather than a repeated placeholder shape.
 */

export interface Payload {
  input: unknown;
  output: unknown;
}

const JOB = 'DEEP-1042-9d3a7c';

export const payloads: Record<number, Payload> = {
  1: {
    input: { jira_id: 'DEEP-1042', tracker: 'jira', base_url: 'https://acme.atlassian.net', expand: ['renderedFields', 'attachment'] },
    output: {
      key: 'DEEP-1042',
      title: 'Allow users to export their own data',
      description:
        'As a signed-in user I want to export my profile and order history so that I can keep my own records.',
      acceptance_criteria: [
        'AC-1 An authenticated user can request an export of their own data',
        'AC-2 The export contains profile and order history as CSV',
        'AC-3 A user cannot request an export for another user',
      ],
      priority: 'High',
      labels: ['self-service', 'privacy'],
      components: ['api', 'web'],
      dependencies: [],
      attachments: [{ filename: 'account-page.png', mime_type: 'image/png' }],
      reporter: 'r.okonkwo',
      source_checksum: '4f1c9e2ab7d05836c1a0e4b9f37d2856ab90c4e17f3d5b820ea6cf19d4b73e05',
    },
  },
  2: {
    input: { schema: 'JiraStoryV1', key: 'DEEP-1042', acceptance_criteria_count: 3 },
    output: {
      ui: ['Render an Export data button on the account settings page', 'Show requested / ready / failed states'],
      backend: ['POST /api/v1/users/{id}/export returns 202 with a job id', 'Ownership check before any read'],
      database: ['No schema change; read-only over users and orders'],
      security: ['Export must be authorised for the owning user only', 'Generated file contains PII — no logging of contents'],
      integration: ['Publishes to the existing notification queue when the file is ready'],
      non_functional: ['Export completes within 30s for 10k order rows'],
    },
  },
  3: {
    input: { schema: ['JiraStoryV1', 'StoryAnalysisV1'], on_ambiguity: 'halt_and_ticket' },
    output: {
      gaps: ['Retention period for generated export files is not stated'],
      contradictions: [],
      unclear_behaviour: ['Behaviour when a second export is requested while one is still running'],
      unavailable_data: [],
      edge_cases: ['User with zero orders', 'Order history exceeding the 30s budget'],
      questions_for_human: [
        { id: 'Q-1', text: 'How long should generated export files be retained before deletion?', blocks_step: null },
      ],
      blocking: false,
    },
  },
  4: {
    input: {
      repository_index: { file_count: 412, modules: ['app/api', 'app/services', 'app/repositories', 'app/models'], languages: ['py', 'tsx'] },
    },
    output: {
      architecture: 'Layered FastAPI service with SQLAlchemy over Postgres; React + Vite front end',
      frameworks: ['fastapi', 'sqlalchemy', 'pytest', 'react'],
      conventions: ['snake_case modules', 'one router per resource', 'services own business logic, repositories own queries'],
      folder_structure: ['app/api', 'app/services', 'app/repositories', 'app/models', 'tests'],
      reusable_components: ['app/services/report.py — existing CSV writer'],
      api_conventions: ['All routes under /api/v1', 'Long jobs return 202 with a job id'],
      db_conventions: ['Alembic migrations only', 'No raw SQL outside repositories'],
    },
  },
  5: {
    input: { schema: ['JiraStoryV1', 'StoryAnalysisV1', 'AmbiguityReportV1', 'ProjectContextV1'] },
    output: {
      title: 'User data export',
      background: 'Users currently open a support ticket to obtain a copy of their own data. This adds a self-service path.',
      objectives: ['Self-service export', 'No support ticket required', 'Meet subject-access-request turnaround'],
      scope_in: ['CSV export of profile and order history', 'Ownership enforcement'],
      scope_out: ['PDF export', 'Bulk admin export', 'Scheduled recurring exports'],
      acceptance_criteria: [
        { id: 'AC-1', text: 'An authenticated user can request an export of their own data' },
        { id: 'AC-2', text: 'The export contains profile and order history as CSV' },
        { id: 'AC-3', text: 'A user cannot request an export for another user' },
      ],
      risks: ['PII handling in the generated file'],
      assumptions: ['Retention period unresolved — carried as an assumption, see Q-1'],
    },
  },
  6: {
    input: {
      gate: 'BRD',
      artifacts: [`05_brd__${JOB}__v1.md`, `05_brd__${JOB}__v1.pdf`],
      artifact_sha256: 'bfdb1432adf492ac5e07d1c9b8a3f6e42d05c8917be3a4f0d2c65b8901ae37f4',
      required_roles: ['product_owner', 'tech_lead'],
      quorum: 1,
    },
    output: {
      gate: 'BRD',
      status: 'APPROVED',
      approver_id: 'priya.raman',
      approver_role: 'product_owner',
      decided_at: '2026-08-12T08:14:22Z',
      comment: 'Scope-out list is right. Retention question can be answered in a follow-up ticket.',
      artifact_sha256: 'bfdb1432adf492ac5e07d1c9b8a3f6e42d05c8917be3a4f0d2c65b8901ae37f4',
    },
  },
  7: {
    input: { schema: ['BrdV1', 'StoryAnalysisV1'], acceptance_criteria: ['AC-1', 'AC-2', 'AC-3'] },
    output: {
      unit: [
        { id: 'UT-1', target: 'ExportService.build', covers: ['AC-2'], given: 'a user with two orders', expect: 'csv with a header row and two order rows' },
        { id: 'UT-2', target: 'ExportService.authorise', covers: ['AC-3'], given: 'a mismatched user id', expect: 'PermissionError' },
        { id: 'UT-3', target: 'ExportService.build', covers: ['AC-2'], given: 'a user with zero orders', expect: 'csv with only a header row' },
      ],
      acceptance: [
        { id: 'AT-1', covers: ['AC-1', 'AC-2'], scenario: 'user requests an export and downloads the resulting file' },
        { id: 'AT-2', covers: ['AC-3'], scenario: 'user requests an export for another user id and receives 403' },
      ],
    },
  },
  8: {
    input: {
      ground_truth: {
        index: { file_count: 412, entry_points: ['app/main.py'] },
        imports: { 'app/api/users.py': ['app.services.user', 'app.deps'], 'app/services/report.py': ['csv', 'app.repositories.order'] },
      },
    },
    output: {
      modules: ['app/api', 'app/services', 'app/repositories', 'app/models'],
      entry_points: ['app/main.py'],
      ci_jobs: ['.github/workflows/lint.yml', '.github/workflows/test.yml'],
      integration_touchpoints: ['notification queue via app/services/notify.py'],
      related_implementations: ['app/services/report.py already writes CSV with the same quoting rules'],
    },
  },
  9: {
    input: { schema: ['BrdV1', 'RepoUnderstandingV1', 'StoryAnalysisV1', 'TestDesignV1'], max_changed_loc_cap: 800 },
    output: {
      files_to_modify: ['app/api/users.py'],
      files_to_create: ['app/services/exporter.py', 'tests/test_exporter.py'],
      allowed_paths: ['app/api/*', 'app/services/*', 'tests/*'],
      loc_budget: 300,
      apis: ['POST /api/v1/users/{id}/export'],
      db_entities: [],
      config_changes: [],
      tests: ['tests/test_exporter.py'],
      docs: ['README.md', 'openapi.yaml'],
    },
  },
  10: {
    input: { schema: ['BrdV1', 'ProjectContextV1', 'RepoUnderstandingV1', 'ImpactManifestV1'] },
    output: {
      summary: 'Self-service CSV export of a user\'s own profile and order history',
      api_contracts: [{ method: 'POST', path: '/api/v1/users/{id}/export', returns: '202 {job_id}', auth: 'bearer, subject must equal {id}' }],
      data_model: [],
      validation: ['{id} must equal the authenticated subject'],
      errors: [
        { code: 403, when: 'id does not match the authenticated subject' },
        { code: 429, when: 'an export for this user is already in flight' },
      ],
      ui_states: ['idle', 'requested', 'ready', 'failed'],
      accessibility: ['Export button has an accessible name', 'Status changes announced via aria-live'],
      security: ['Ownership check before any read', 'No PII in application logs'],
      acceptance_criteria: ['AC-1', 'AC-2', 'AC-3'],
      implementation_boundaries: [
        'Only app/api/*, app/services/* and tests/* may be touched',
        'Total changed lines must stay under 300',
        'No refactoring unrelated to the acceptance criteria',
      ],
    },
  },
  11: {
    input: { schema: ['FeatureSpecV1', 'ImpactManifestV1'] },
    output: {
      ordered_changes: [
        { seq: 1, layer: 'service', file: 'app/services/exporter.py', action: 'create', rationale: 'Owns the CSV assembly and the ownership check' },
        { seq: 2, layer: 'api', file: 'app/api/users.py', action: 'modify', rationale: 'Adds the route that delegates to the service' },
        { seq: 3, layer: 'tests', file: 'tests/test_exporter.py', action: 'create', rationale: 'Covers AC-2 and AC-3 against the service directly' },
      ],
    },
  },
  12: {
    input: {
      spec_summary: 'Self-service CSV export of a user\'s own data',
      ordered_plan: ['1 [service] create app/services/exporter.py', '2 [api] modify app/api/users.py', '3 [tests] create tests/test_exporter.py'],
      hard_limits: { allowed_paths: ['app/api/*', 'app/services/*', 'tests/*'], loc_budget: 300 },
      remediation_context: 'Attempt 2 — step 18 reported a committed credential and a vulnerable dependency',
    },
    output: {
      changed_files: ['app/api/users.py', 'app/services/exporter.py'],
      created_files: ['tests/test_exporter.py'],
      changed_loc: 171,
      commits: ['feat(export): add self-service user data export', 'fix(export): read signing key from the environment'],
      policy_violations: [],
    },
  },
  13: {
    input: {
      traceability_matrix: {
        'AC-1': { files: ['app/api/users.py'], tests: ['tests/test_exporter.py'] },
        'AC-2': { files: ['app/services/exporter.py'], tests: ['tests/test_exporter.py'] },
        'AC-3': { files: ['app/services/exporter.py'], tests: ['tests/test_exporter.py'] },
      },
      uncovered_criteria: [],
    },
    output: {
      covered: ['AC-1', 'AC-2', 'AC-3'],
      missing: [],
      unrelated_changes: [],
      hallucinated_functionality: [],
      verdict: 'PASSED',
    },
  },
  14: {
    input: { checks: ['compile', 'lint', 'format', 'types', 'forbidden_dependencies'], workspace: 'workspace/DEEP-1042' },
    output: {
      checks: {
        compile: { ok: true },
        lint: { ok: true, output: 'All checks passed!' },
        format: { ok: true },
        types: { ok: true, output: 'Success: no issues found in 3 source files' },
        forbidden_dependencies: { ok: true, found: [] },
      },
      passed: true,
    },
  },
  15: {
    input: { designs: ['UT-1', 'UT-2', 'UT-3'], changed_files: ['app/services/exporter.py', 'app/api/users.py'] },
    output: {
      created: ['tests/test_exporter.py'],
      updated: ['tests/conftest.py'],
      removed: [],
      unimplementable: [],
    },
  },
  16: {
    input: { runner: 'pytest', workspace: 'workspace/DEEP-1042', thresholds: { min_line_coverage_pct: 80, min_changed_line_coverage_pct: 90 } },
    output: {
      passed: 47,
      failed: 0,
      skipped: 1,
      duration_s: 6.4,
      failures: [],
      coverage: { line_pct: 88.7, changed_line_pct: 96.2, uncovered_files: ['app/services/notify.py'] },
      coverage_ok: true,
    },
  },
  17: {
    input: { runner: 'playwright', ephemeral_env: { enabled: true, compose_file: 'docker-compose.test.yml' } },
    output: {
      passed: 6,
      failed: 0,
      skipped: 0,
      duration_s: 41.8,
      failures: [],
      screenshots: [],
    },
  },
  18: {
    input: { scanners: ['sast', 'sca', 'secrets'], block_on_severity: ['CRITICAL', 'HIGH'] },
    output: {
      reports: {
        sast: { scanner: 'semgrep', findings: [] },
        sca: {
          scanner: 'trivy',
          findings: [
            {
              id: 'CVE-2026-21841',
              severity: 'HIGH',
              title: 'pyjwt 2.4.0: signature verification bypass with crafted alg header',
              file: 'requirements.txt',
              remediation: 'upgrade to 2.10.1',
            },
          ],
        },
        secrets: {
          scanner: 'gitleaks',
          findings: [
            {
              id: 'generic-api-key',
              severity: 'CRITICAL',
              title: 'potential secret: export signing key committed in source',
              file: 'app/services/exporter.py',
              line: 24,
              remediation: 'rotate the credential and read it from the secret manager',
            },
          ],
        },
      },
      blocking_findings: [
        { id: 'generic-api-key', severity: 'CRITICAL', file: 'app/services/exporter.py', line: 24 },
        { id: 'CVE-2026-21841', severity: 'HIGH', file: 'requirements.txt' },
      ],
    },
  },
  19: {
    input: { target: 'https://staging.acme.internal', scanner: 'zap', authenticated: true },
    output: null,
  },
  20: { input: null, output: null },
  21: { input: null, output: null },
  22: { input: null, output: null },
  23: { input: null, output: null },
  24: {
    input: {
      gate: 'PR',
      pull_request: null,
      blocking_findings: 2,
      required_roles: ['tech_lead', 'security_owner'],
      quorum: 1,
      block_if_open_findings: true,
    },
    output: null,
  },
};
