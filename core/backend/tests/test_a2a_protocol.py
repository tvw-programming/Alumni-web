"""Envelope threading, schema lookup and modality negotiation."""

import pytest

from codegen_core.core.envelope import ComponentRef, Envelope, Intent
from codegen_core.core.errors import UnsupportedModality
from codegen_core.core.negotiate import adapt, matches, summarise
from codegen_core.core.parts import Modality, blob, structured, text


def _env(parts):
    return Envelope(
        correlation_id="JOB-1",
        sender=ComponentRef(name="a", kind="RUNNER"),
        recipient=ComponentRef(step=2, name="b", kind="AGENT"),
        parts=parts,
    )


def test_json_part_lookup_by_schema_id():
    env = _env([structured("BrdV1", {"title": "t"})])
    assert env.json_part("BrdV1")["title"] == "t"
    with pytest.raises(KeyError):
        env.json_part("NopeV1")


def test_reply_preserves_correlation_and_records_parent():
    env = _env([text("hi")])
    out = env.reply(ComponentRef(step=2, name="b", kind="AGENT"), [text("done")])
    assert out.correlation_id == "JOB-1"
    assert out.provenance.parent_message_ids == [env.message_id]
    assert out.intent is Intent.RESULT


def test_failed_flag_tracks_status():
    env = _env([])
    assert not env.reply(env.sender, []).failed
    assert env.reply(env.sender, [], status="FAILED").failed


def test_mime_matching_supports_wildcards():
    assert matches("application/json", ["*/*"])
    assert matches("image/jpeg", ["image/*"])
    assert not matches("image/jpeg", ["application/json"])


def test_adapt_downgrades_json_to_text(ctx):
    parts = adapt([structured("BrdV1", {"a": 1})], ["text/plain"], ctx)
    assert parts[0].modality is Modality.TEXT and '"a": 1' in parts[0].text


def test_adapt_raises_when_no_adapter_exists(ctx):
    part = blob("artifact://x/y.bin", "application/octet-stream")
    with pytest.raises(UnsupportedModality):
        adapt([part], ["application/json"], ctx)


def test_summarise_is_log_friendly():
    assert summarise([structured("BrdV1", {})]) == "BrdV1"
