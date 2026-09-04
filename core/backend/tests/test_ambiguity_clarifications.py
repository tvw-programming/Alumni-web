"""Step 03 must honour clarifications typed on the run monitor."""

from codegen_core.steps._loader import load_steps


def test_post_process_drops_questions_already_answered_in_story(cfg):
    step = load_steps(cfg)[3]

    class Ctx:
        def recall(self, _schema):
            return {
                "description": (
                    "Do the thing.\n\n"
                    "## Clarifications from run monitor\n\n"
                    "### Q1\n**Question:** format?\n**Answer:** JSON\n\n"
                    "### Q2\n**Question:** rows?\n**Answer:** own row\n"
                )
            }

    out = step.post_process(
        {
            "questions_for_human": [
                {"id": "Q1", "text": "format?", "blocks_step": 12},
                {"id": "Q2", "text": "rows?", "blocks_step": 12},
                {"id": "Q3", "text": "new gap?", "blocks_step": 8},
            ],
            "blocking": True,
            "gaps": [],
        },
        Ctx(),
    )
    assert [q["id"] for q in out["questions_for_human"]] == ["Q3"]
    assert out["blocking"] is True


def test_post_process_clears_blocking_when_all_answers_are_present(cfg):
    step = load_steps(cfg)[3]

    class Ctx:
        def recall(self, _schema):
            return {
                "description": (
                    "## Clarifications from run monitor\n\n"
                    "### Q1\n**Answer:** a\n\n"
                    "### Q2\n**Answer:** b\n"
                )
            }

    out = step.post_process(
        {
            "questions_for_human": [
                {"id": "Q1", "text": "a?", "blocks_step": 12},
                {"id": "Q2", "text": "b?", "blocks_step": 12},
            ],
            "blocking": True,
            "gaps": [],
        },
        Ctx(),
    )
    assert out["questions_for_human"] == []
    assert out["blocking"] is False
    assert step.status_for(out, Ctx()) == "OK"
