"""Content validation, on guardrails-ai.

Two things are pinned here beyond the detections themselves: a finding must
never quote the credential it found, and the library must not phone home.
"""

import pytest

from codegen_core.core.errors import PolicyViolation
from codegen_core.core.guardrails import (
    GUARDRAILS_AVAILABLE,
    build_guard,
    run_generated_code_guardrails,
)

pytestmark = pytest.mark.skipif(
    not GUARDRAILS_AVAILABLE, reason="guardrails extra not installed"
)

INTENT = {"action": "apply_patch", "target_files": ["app/x.py"], "risk_level": "critical"}


def _check(files, mutating=False):
    return run_generated_code_guardrails(files, INTENT, mutating=mutating)


# --------------------------------------------------------------------------- #
# Telemetry
# --------------------------------------------------------------------------- #
def test_guardrails_does_not_phone_home():
    """guardrails-ai ships an OTLP exporter aimed at a vendor endpoint, on by
    default. A pipeline that handles source code must not post traces to a third
    party as a side effect of installing a validation library."""
    from guardrails import OnFailAction
    from guardrails.settings import settings

    from codegen_core.core.guardrails import _VALIDATORS

    build_guard("telemetry-probe")

    assert settings.rc.enable_metrics is False
    assert settings.disable_tracing is True
    validator = _VALIDATORS[0](on_fail=OnFailAction.EXCEPTION)
    assert validator._disable_telemetry is True


# --------------------------------------------------------------------------- #
# Detections
# --------------------------------------------------------------------------- #
def test_clean_code_passes():
    files = {
        "app/service.py": (
            "import os\n\nAPI_KEY = os.getenv('API_KEY')\n\n"
            "def fetch(client, url):\n    return client.get(url, timeout=10).json()\n"
        )
    }
    assert all(r.passed for r in _check(files))


@pytest.mark.parametrize(
    "line",
    [
        "AWS_KEY = 'AKIAIOSFODNN7EXAMPLE'",
        "client = OpenAI(api_key='sk-live-aaaaaaaaaaaaaaaaaaaaaaaa')",
        "TOKEN = 'ghp_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'",
        'password = "s3cr3t-production-value"',
        "-----BEGIN RSA PRIVATE KEY-----",
    ],
)
def test_credentials_are_caught(line):
    results = _check({"app/config.py": line})
    assert any(not r.passed for r in results)


@pytest.mark.parametrize(
    "line",
    [
        "API_KEY = os.getenv('API_KEY')",
        'password = "changeme"',
        'api_key = "<your-key-here>"',
        'secret = "${VAULT_SECRET}"',
    ],
)
def test_indirection_and_placeholders_are_not_flagged(line):
    """A check that flags os.getenv gets switched off within a week."""
    assert all(r.passed for r in _check({"app/config.py": line}))


@pytest.mark.parametrize(
    "line",
    [
        "subprocess.run(cmd, shell=True)",
        "os.system('rm -rf /tmp/x')",
        "value = eval(user_input)",
        "obj = pickle.loads(blob)",
        "cfg = yaml.load(text)",
        "requests.get(url, verify=False)",
    ],
)
def test_unsafe_calls_are_caught(line):
    assert any(not r.passed for r in _check({"app/x.py": line}))


@pytest.mark.parametrize(
    "line",
    [
        "subprocess.run(cmd, shell=False)",
        "cfg = yaml.load(text, Loader=yaml.SafeLoader)",
        "obj = json.loads(blob)",
        "h = hashlib.sha256(data)",
    ],
)
def test_safe_forms_are_not_flagged(line):
    assert all(r.passed for r in _check({"app/x.py": line}))


# --------------------------------------------------------------------------- #
# Reporting
# --------------------------------------------------------------------------- #
def test_a_finding_never_quotes_the_whole_credential():
    """The excerpt reaches the journal, a span and the dashboard.

    guardrails-ai carries it in ErrorSpan.reason, which the validator fills with
    a masked value rather than the match.
    """
    secret = "sk-live-abcdefghijklmnopqrstuvwx"
    results = _check({"app/c.py": f"key = '{secret}'"})

    failed = [r for r in results if not r.passed]
    assert failed
    for finding in failed[0].findings:
        assert secret not in finding.excerpt


def test_a_mutation_is_stopped_not_merely_recorded():
    with pytest.raises(PolicyViolation, match="rejected by pipeline guardrails"):
        _check({"app/c.py": "key = 'sk-live-abcdefghijklmnopqrstuvwx'"}, mutating=True)


def test_a_non_mutating_check_reports_without_raising():
    results = _check({"app/c.py": "key = 'sk-live-abcdefghijklmnopqrstuvwx'"})
    assert any(not r.passed for r in results)


def test_every_file_is_checked_before_any_raises():
    """A changeset with two problems reports both, not the first one found."""
    files = {
        "app/c.py": "key = 'sk-live-abcdefghijklmnopqrstuvwx'",
        "app/d.py": "subprocess.run(cmd, shell=True)",
    }
    with pytest.raises(PolicyViolation) as excinfo:
        run_generated_code_guardrails(files, INTENT, mutating=True)
    message = str(excinfo.value)
    assert "app/c.py" in message and "app/d.py" in message


def test_results_carry_their_level():
    """'validation passed' with no level hides which layer was missing."""
    for level in ("pipeline", "gateway"):
        results = run_generated_code_guardrails(
            {"app/x.py": "x = 1\n"}, INTENT, mutating=True, level=level
        )
        assert results
        for result in results:
            assert result.level == level
            assert result.as_event()["guardrail_level"] == level
