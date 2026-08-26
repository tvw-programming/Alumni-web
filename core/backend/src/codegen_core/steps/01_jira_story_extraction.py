"""Step 01 - Jira Story Extraction.

Component: PLUGIN (+ TOOL)      Category: Ingestion / Integration

Why it is a plugin, not an agent: reading a ticket is a deterministic API call.
Sending it through a model would add cost, latency and a hallucination surface
for zero benefit. The only judgement here - pulling acceptance criteria out of
free-text description - is a regex, and when that regex fails we prefer an empty
list that step 03 will flag over a model's guess.

Two sources, one shape. A developer starting a run is asked for the story
number, title, description and acceptance criteria; skipping that form falls
back to the tracker configured in config.json. Either way this step emits the
same canonical JiraStoryV1 with a checksum, so every later artifact traces back
to the exact ticket state that produced it and nothing downstream needs to know
which source it came from.
"""

from __future__ import annotations

from typing import Any

from ..core import story_input
from ..core.component import Plugin
from ..core.envelope import Envelope
from ..core.parts import structured
from ..plugins.factory import build_plugin
from ..schemas.jira import JiraStoryV1


class JiraStoryExtraction(Plugin):
    step = 1
    name = "jira_story_extraction"
    category = "Ingestion / Integration"
    consumes: list[str] = []
    produces = ["01_jira_story__{job}__v{v}.json"]
    accepts = ["*/*"]

    def handle(self, env: Envelope, ctx: Any) -> Envelope:
        typed = story_input.load(ctx)
        if typed is not None:
            raw, source = typed.as_story(), "manual"
        else:
            raw, source = build_plugin(ctx.cfg, "tracker", ctx).fetch_story(ctx.jira_id), "tracker"

        story = JiraStoryV1.model_validate(raw).model_dump(mode="json")
        # Which source answered is provenance, and it belongs in the audit
        # record rather than in the schema: JiraStoryV1 is append-only, and a
        # consumer three steps later has no business branching on it.
        ctx.journal.append_event("story_source", step=self.step, source=source,
                                 key=story.get("key"), checksum=story.get("source_checksum"))

        ctx.remember("JiraStoryV1", story)
        # Everything this run writes belongs together, so the story folder is
        # bound here — the first moment the title is known — and before the
        # first artifact lands in it. The story's own key wins over the job's,
        # which carries a prefix the developer may never have typed.
        ctx.artifacts.bind_story(story.get("key") or ctx.jira_id, story.get("title", ""))
        ctx.artifacts.write(self.step, "jira_story", story, ext="json")
        return env.reply(self.ref(), [structured("JiraStoryV1", story)])


STEP = JiraStoryExtraction()
