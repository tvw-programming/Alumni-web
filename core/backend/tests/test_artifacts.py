"""Naming and extension rules are enforced on write, not merely documented."""

import pytest

from codegen_core.core.errors import ArtifactError


def test_naming_convention(ctx):
    uri = ctx.artifacts.write(9, "impact_manifest", {"a": 1}, ext="json")
    assert uri.endswith(f"09_impact_manifest__{ctx.job_id}__v1.json")


def test_variant_and_versioning(ctx):
    ctx.artifacts.write(17, "e2e", b"x", ext="jpg", output_class="error_snapshot", variant="failure_1")
    second = ctx.artifacts.write(17, "e2e", b"y", ext="jpg", output_class="error_snapshot",
                                 variant="failure_1")
    assert second.endswith("v2.jpg")


def test_versions_are_per_extension(ctx):
    md = ctx.artifacts.write(5, "brd", "# t", ext="md", output_class="specification")
    pdf = ctx.artifacts.write(5, "brd", b"%PDF", ext="pdf", output_class="document")
    assert md.endswith("v1.md") and pdf.endswith("v1.pdf")


def test_wrong_extension_for_output_class_is_refused(ctx):
    with pytest.raises(ArtifactError, match="must use one of"):
        ctx.artifacts.write(5, "brd", "# t", ext="json", output_class="specification")


def test_unknown_extension_is_refused(ctx):
    with pytest.raises(ArtifactError, match="unknown extension"):
        ctx.artifacts.write(5, "brd", "x", ext="txt")


def test_checksum_recorded(ctx):
    uri = ctx.artifacts.write(1, "jira_story", {"key": "DEEP-1"}, ext="json")
    assert len(ctx.artifacts.sha_of(uri)) == 64
