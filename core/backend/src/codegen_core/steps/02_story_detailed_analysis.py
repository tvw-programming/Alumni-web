"""Step 02 - User Story Detailed Analysis.

Component: AGENT                Category: Requirement Decomposition

Splits one ticket into six independent concerns (UI, backend, DB, security,
integration, non-functional). The split matters because every later step reasons
about one axis at a time: the impact analyser cares about DB and API, the
security scanner cares about the security axis, the test designer walks all six.

Asking one model to hold all six concerns at once is where scope creep starts.
"""

from __future__ import annotations

from ._base import JsonAgentStep


class StoryDetailedAnalysis(JsonAgentStep):
    step = 2
    name = "story_detailed_analysis"
    category = "Requirement Decomposition"
    capability = "reasoning"
    consumes = ["JiraStoryV1"]
    emits = "StoryAnalysisV1"
    slug = "story_analysis"
    produces = ["02_story_analysis__{job}__v{v}.json"]
    accepts = ["application/json", "text/plain"]


STEP = StoryDetailedAnalysis()
