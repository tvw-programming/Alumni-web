"""The shape a model is told to produce.

Every one of these pins a real rejection. A nested object used to reach the
prompt as its key names alone — no types — so the model filled them by guessing,
and strict validation threw the step away for output it was never told how to
shape. Two guesses cost two runs:

    questions_for_human.0.id           1          Input should be a valid string
    questions_for_human.0.blocks_step  'backend'  unable to parse as an integer
    acceptance.2.covers                'U-6'      Input should be a valid list
"""

from __future__ import annotations

import pytest

from codegen_core.schemas import REGISTRY
from codegen_core.steps._base import field_spec


def _line(schema_id: str, field: str) -> str:
    for line in field_spec(schema_id).splitlines():
        if line.startswith(f"- {field}:"):
            return line
    raise AssertionError(f"{schema_id} has no line for {field}")


def test_a_nested_object_states_the_type_of_every_key():
    line = _line("AmbiguityReportV1", "questions_for_human")

    assert "id (string" in line
    assert "text (string" in line
    # The field that decides whether the run halts for a human. It is `int |
    # None`, and both halves have to survive into the prompt: told only
    # "number", a model has no licence to leave it out and invents one.
    assert "blocks_step (number or null" in line


def test_a_nested_array_states_what_it_is_an_array_of():
    """`covers` is a list of ids. Given only the key name, a model sent the one
    id it had as a bare string."""
    assert "covers (array of string" in _line("TestDesignV1", "acceptance")


def test_covers_states_which_direction_it_points():
    """The failure this pass exists for: a model built the coverage matrix the
    other way round, and nothing in the prompt said which way was meant."""
    for field in ("unit", "acceptance"):
        line = _line("TestDesignV1", field)
        assert "BRD acceptance-criterion ids this test verifies" in line
        assert "never the ids of other tests" in line


def test_descriptions_reach_the_prompt_where_a_type_is_not_enough():
    """A type fixes the shape, not the sense: `blocks_step` is a number, but so
    is every other number the model could reach for."""
    line = _line("AmbiguityReportV1", "questions_for_human")

    assert "pipeline step number from 1 to 24" in line
    assert "never a step name" in line


def test_optional_is_marked_inside_the_key_it_belongs_to():
    """Trailing it outside the brackets read as another key entirely."""
    line = _line("TestDesignV1", "acceptance")

    assert "scenario (string — " in line and "; optional)" in line
    # The marker outside the brackets is the old rendering, and read as a key.
    assert ", optional," not in line


def _constrained_fields() -> list[tuple[str, str]]:
    """Every field whose items are a declared model, across all schemas.

    These are the ones a model can get wrong: the schema fixes their keys, so
    strict validation rejects anything else. A `list[dict]` is excluded because
    it constrains nothing — TestReportV1.failures and FeatureSpecV1.errors are
    deliberately free-form, and "array of object" is the honest description of a
    field that accepts any object at all.
    """
    out = []
    for schema_id, model in REGISTRY.items():
        schema = model.model_json_schema()
        for name, prop in schema.get("properties", {}).items():
            ref = prop.get("$ref") or (prop.get("items") or {}).get("$ref")
            if ref:
                out.append((schema_id, name))
    return sorted(out)


@pytest.mark.parametrize("schema_id,field", _constrained_fields())
def test_every_declared_nested_model_states_its_key_types(schema_id: str, field: str):
    """The whole class of failure, across every schema at once. Nine fields
    reached the prompt as key names alone; each was a step waiting to die on the
    first local model that guessed wrong."""
    line = _line(schema_id, field)

    assert "object with keys:" in line, line
    # Naming a key without a type in brackets after it is the old behaviour.
    keys = line.split("object with keys:", 1)[1]
    for key in (k.strip() for k in keys.split("),")):
        assert "(" in key, f"{schema_id}.{field} names a key with no type: {key}"


@pytest.mark.parametrize("schema_id", sorted(REGISTRY))
def test_every_schema_renders_without_recursing_forever(schema_id: str):
    assert field_spec(schema_id).startswith(f"### {schema_id} fields")


# --------------------------------------------------------------------------- #
# Step 07's own check, which is the thing the description exists to satisfy.
# --------------------------------------------------------------------------- #
def test_step_07_names_the_uncovered_criteria(cfg, ctx):
    """A bare FAILED sent a reader to the artifact to work out which of four
    criteria was missed, and said nothing about the usual cause."""
    from codegen_core.steps.design import __name__ as _  # noqa: F401
    from codegen_core.steps._loader import load_steps

    step = load_steps(cfg)[7]
    ctx.remember("BrdV1", {"acceptance_criteria": [{"id": f"AC-{n}", "text": ""} for n in (1, 2)]})

    # Exactly the inversion the model produced: acceptance entries listing the
    # unit tests that cover them, unit entries covering nothing.
    inverted = {
        "unit": [{"id": "U-1", "target": "x", "covers": []}],
        "acceptance": [{"id": "AC-1", "covers": ["U-1"]}],
    }
    assert step.status_for(inverted, ctx) == "FAILED"

    reason = [e for e in ctx.journal.entries() if e.get("event") == "step_error"][-1]["error"]
    assert "AC-1, AC-2" in reason
    assert "points the wrong way" in reason

    # Right way round: every criterion covered by a test that names it.
    correct = {
        "unit": [{"id": "U-1", "target": "x", "covers": ["AC-1", "AC-2"]}],
        "acceptance": [{"id": "S-1", "covers": ["AC-1"]}],
    }
    assert step.status_for(correct, ctx) == "OK"


def test_step_07_status_stays_a_token_an_edge_could_name(cfg, ctx):
    """The reason belongs in the journal. A status is the key remediation edges
    are declared on, so "FAILED: no test covers AC-1" would match no edge — and
    would fail to match silently."""
    from codegen_core.steps._loader import load_steps

    step = load_steps(cfg)[7]
    ctx.remember("BrdV1", {"acceptance_criteria": [{"id": "AC-1", "text": ""}]})

    assert step.status_for({"unit": [], "acceptance": []}, ctx) == "FAILED"
