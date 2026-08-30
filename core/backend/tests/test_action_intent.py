"""Justification has to survive inspection, or the field is theatre.

Every case here is a justification that passes a min-length check and says
nothing. If these stop failing, the transparency requirement has quietly become
a free-text box nobody reads.
"""

import pytest

from codegen_core.schemas.action import (
    ActionIntentV1,
    IntentViolation,
    validate_intent,
)


def _intent(**overrides) -> ActionIntentV1:
    base = dict(
        step=12,
        agent="code_update",
        action="apply_patch",
        justification=(
            "Change src/auth/session.py to rotate the refresh token on re-auth, "
            "which acceptance criterion AC-2 requires. Scope is bounded by the "
            "step-09 whitelist."
        ),
        target_files=["src/auth/session.py"],
        expected_outcome="The session boundary rotates tokens and AC-2 becomes verifiable.",
        validation_plan=["step 16 pytest unit test execution"],
        risk_level="critical",
        requires_human_approval=True,
    )
    base.update(overrides)
    return ActionIntentV1(**base)


def test_a_specific_justification_passes():
    assert validate_intent(_intent()) is not None


@pytest.mark.parametrize(
    "empty",
    [
        "Fix the issue",
        "fixed the bug",
        "Update the code",
        "Implement the feature",
        "As requested",
        "Per the spec",
        "Refactoring",
        "Makes it work",
    ],
)
def test_generic_justifications_are_refused(empty):
    """These all clear min_length once padded, and all say nothing."""
    padded = empty + "." * (40 - len(empty))
    with pytest.raises(IntentViolation, match="generic"):
        validate_intent(_intent(justification=padded))


def test_justification_must_mention_a_file_it_changes():
    with pytest.raises(IntentViolation, match="does not mention"):
        validate_intent(
            _intent(
                justification=(
                    "Rotate the refresh token on re-authentication so that a stolen "
                    "token stops working, as acceptance criterion AC-2 requires."
                ),
                target_files=["src/auth/session.py"],
            )
        )


def test_a_mutation_must_declare_its_files():
    with pytest.raises(IntentViolation, match="must declare the files"):
        validate_intent(_intent(target_files=[]))


def test_a_mutation_must_state_how_it_is_verified():
    with pytest.raises(IntentViolation, match="how it will be verified"):
        validate_intent(_intent(validation_plan=[]))


def test_a_validation_plan_must_name_a_real_check():
    """'Test it thoroughly' is not a plan."""
    with pytest.raises(IntentViolation, match="no concrete check"):
        validate_intent(_intent(validation_plan=["Test it thoroughly", "Check it works"]))


def test_a_step_cannot_call_itself_critical_and_wave_itself_through():
    with pytest.raises(IntentViolation, match="requires_human_approval"):
        validate_intent(_intent(risk_level="critical", requires_human_approval=False))


def test_read_actions_are_held_to_a_lower_bar():
    """A read needs a reason, not a file list or a validation plan."""
    intent = validate_intent(
        ActionIntentV1(
            step=8,
            agent="repo_understanding",
            action="read",
            justification=(
                "Index the repository so that step 09 can scope the change against "
                "modules that actually exist rather than invented ones."
            ),
            expected_outcome="A file index and module list for downstream scoping.",
        )
    )
    assert intent.target_files == []
    assert intent.validation_plan == []
