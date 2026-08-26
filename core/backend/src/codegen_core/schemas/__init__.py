"""Versioned artifact contracts.

Every structured payload that crosses a component boundary has a schema class
here. Rules:
  * Never edit a released schema in place - add V2 alongside V1.
  * schema_id in a JsonPart is the class name, so receivers can validate.
"""

from .analysis import AmbiguityReportV1, StoryAnalysisV1
from .brd import ApprovalRecordV1, BrdV1
from .impact import ChangePlanV1, ImpactManifestV1
from .jira import JiraStoryV1
from .review import AiReviewV1, RequirementCoverageV1
from .security import DastReportV1, SastReportV1
from .spec import FeatureSpecV1, ProjectContextV1, RepoUnderstandingV1
from .testing import CoverageV1, TestDesignV1, TestReportV1

REGISTRY = {
    c.__name__: c
    for c in (
        JiraStoryV1, StoryAnalysisV1, AmbiguityReportV1, ProjectContextV1, BrdV1,
        ApprovalRecordV1, TestDesignV1, RepoUnderstandingV1, ImpactManifestV1,
        FeatureSpecV1, ChangePlanV1, RequirementCoverageV1, TestReportV1, CoverageV1,
        SastReportV1, DastReportV1, AiReviewV1,
    )
}

__all__ = ["REGISTRY", *REGISTRY]
