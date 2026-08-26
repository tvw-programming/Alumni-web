"""Deterministic offline backend.

Lets the whole 24-step pipeline run with no network, no keys, and no cost -
which is how you smoke-test the orchestration, the gates, and the artifact
conventions before spending a cent on tokens.

It returns schema-shaped stub JSON keyed off whatever the prompt asks for.
"""

from __future__ import annotations

import hashlib
import json
import re
from typing import Any

from ..base import BaseBackend, Completion

STUBS: dict[str, Any] = {
    "StoryAnalysisV1": {
        "ui": ["Render export button on the account page"],
        "backend": ["POST /api/v1/users/{id}/export returns a job id"],
        "database": ["No schema change; read-only over users and orders"],
        "security": ["Export must be authorised for the owning user only"],
        "integration": ["Publishes to the existing notification queue"],
        "non_functional": ["Export completes within 30s for 10k rows"],
    },
    "AmbiguityReportV1": {
        "gaps": [], "contradictions": [], "unclear_behaviour": [],
        "questions_for_human": [], "blocking": False,
    },
    "ProjectContextV1": {
        "architecture": "Layered FastAPI service with SQLAlchemy over Postgres",
        "frameworks": ["fastapi", "sqlalchemy", "pytest"],
        "conventions": ["snake_case modules", "one router per resource"],
        "folder_structure": ["app/api", "app/services", "app/repositories", "app/models"],
        "reusable_components": ["app/services/exporter.py"],
    },
    "BrdV1": {
        "title": "User data export",
        "background": "Users need a self-service export of their own data.",
        "objectives": ["Self-service export", "No support ticket required"],
        "scope_in": ["CSV export of profile and orders"],
        "scope_out": ["PDF export", "Bulk admin export"],
        "acceptance_criteria": [
            {"id": "AC-1", "text": "An authenticated user can request an export of their own data"},
            {"id": "AC-2", "text": "The export contains profile and order history as CSV"},
            {"id": "AC-3", "text": "A user cannot request an export for another user"},
        ],
        "risks": ["PII handling in the generated file"],
    },
    "TestDesignV1": {
        "unit": [
            {"id": "UT-1", "target": "ExportService.build", "covers": ["AC-2"],
             "given": "a user with two orders", "expect": "csv with three rows"},
            {"id": "UT-2", "target": "ExportService.authorise", "covers": ["AC-3"],
             "given": "a mismatched user id", "expect": "PermissionError"},
        ],
        "acceptance": [
            {"id": "AT-1", "covers": ["AC-1", "AC-2"],
             "scenario": "user requests export and downloads the file"}
        ],
    },
    "RepoUnderstandingV1": {
        "modules": ["app/api", "app/services", "app/repositories"],
        "entry_points": ["app/main.py"],
        "ci_jobs": ["lint", "test"],
        "integration_touchpoints": ["notification queue"],
        "related_implementations": ["app/services/report.py"],
    },
    "ImpactManifestV1": {
        "files_to_modify": ["app/api/users.py"],
        "files_to_create": ["app/services/exporter.py", "tests/test_exporter.py"],
        "allowed_paths": ["app/api/*", "app/services/*", "tests/*"],
        "loc_budget": 300,
        "apis": ["POST /api/v1/users/{id}/export"],
        "db_entities": [],
        "config_changes": [],
        "docs": ["README.md"],
    },
    "FeatureSpecV1": {
        "summary": "Self-service CSV export of a user's own data",
        "api_contracts": [
            {"method": "POST", "path": "/api/v1/users/{id}/export", "returns": "202 {job_id}"}
        ],
        "data_model": [], "validation": ["id must equal the authenticated subject"],
        "errors": [{"code": 403, "when": "id != subject"}],
        "ui_states": ["idle", "requested", "ready", "failed"],
        "accessibility": ["button has an accessible name"],
        "security": ["ownership check before any read"],
        "acceptance_criteria": ["AC-1", "AC-2", "AC-3"],
    },
    "ChangePlanV1": {
        "ordered_changes": [
            {"seq": 1, "layer": "service", "file": "app/services/exporter.py", "action": "create"},
            {"seq": 2, "layer": "api", "file": "app/api/users.py", "action": "modify"},
            {"seq": 3, "layer": "tests", "file": "tests/test_exporter.py", "action": "create"},
        ]
    },
    "CodeChangesetV1": {
        "changed_files": ["app/services/exporter.py", "app/api/users.py"],
        "created_files": ["tests/test_exporter.py"],
        "changed_loc": 148,
        "commits": ["feat(export): add self-service user data export"],
    },
    "RequirementCoverageV1": {
        "covered": ["AC-1", "AC-2", "AC-3"], "missing": [], "unrelated_changes": [],
        "hallucinated_functionality": [], "verdict": "PASSED",
    },
    "TestSyncV1": {"created": ["tests/test_exporter.py"], "updated": [], "removed": []},
    "AiReviewV1": {
        "requirement_compliance": "PASSED", "bugs": [], "regression_risk": "low",
        "security": [], "performance": [], "maintainability": ["consider extracting the CSV writer"],
        "verdict": "APPROVED",
    },
    "TechnicalDesignV1": {
        "architecture": "One new service class behind the existing users router",
        "sequence": ["client -> api -> service -> repository -> csv"],
        "apis": ["POST /api/v1/users/{id}/export"], "db_changes": [],
        "impacted_files": ["app/api/users.py", "app/services/exporter.py"],
        "decisions": ["synchronous export for v1; async job if rows exceed 50k"],
        "security_considerations": ["ownership check", "no PII in logs"],
    },
    "DocUpdateV1": {
        "readme": True, "openapi": True, "developer_docs": False,
        "changed": ["README.md", "openapi.yaml"],
    },
    "ReleaseNotesV1": {
        "feature": "Self-service user data export", "bugs_fixed": [],
        "behaviour_changes": ["New POST endpoint under /api/v1/users"],
        "migration_notes": [],
    },
}


class MockBackend(BaseBackend):
    """Returns stub payloads keyed by the schema id named in the prompt."""

    tier = "mock"

    #: The base step class always asks for its output schema by name in this form.
    REQUESTED = re.compile(r"matching the (\w+) schema")

    def _invoke(self, system: str, user: str, **params: Any) -> Completion:
        prompt = f"{system}\n{user}"

        # Match the schema the step was ASKED to emit, not merely one it was
        # given as input - step 05 consumes StoryAnalysisV1 but emits BrdV1.
        m = self.REQUESTED.search(prompt)
        if m and m.group(1) in STUBS:
            body = json.dumps(STUBS[m.group(1)], indent=2)
            return Completion(body, tokens_in=len(prompt) // 4, tokens_out=len(body) // 4)

        for schema_id, payload in STUBS.items():
            if schema_id in prompt:
                body = json.dumps(payload, indent=2)
                return Completion(body, tokens_in=len(prompt) // 4, tokens_out=len(body) // 4)
        digest = hashlib.sha256(prompt.encode()).hexdigest()[:8]
        body = json.dumps({"mock": True, "digest": digest, "note": "no stub matched"}, indent=2)
        return Completion(body, tokens_in=len(prompt) // 4, tokens_out=len(body) // 4)

    def describe_image(self, path: Any) -> str:
        return f"[mock caption of {path}]"
