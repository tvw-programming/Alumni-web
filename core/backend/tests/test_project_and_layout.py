"""Where a run reads code from, and where it writes its output to.

Two settings a person edits by hand: the project the story is implemented
against, and the folder its artifacts land in. Both fail loudly when wrong,
because both are silent and expensive when they are wrong quietly.
"""

import json
from pathlib import Path

import pytest

from codegen_core.core.artifacts import ArtifactStore, safe_folder_name
from codegen_core.core.config import ConfigLoader
from codegen_core.core.context import JobContext
from codegen_core.core.errors import ConfigError

ROOT = Path(__file__).resolve().parents[1]


# --------------------------------------------------------------------------- #
# the story folder
# --------------------------------------------------------------------------- #
@pytest.mark.parametrize(
    ("jira", "title", "expected"),
    [
        ("DEEP-2042", "Implement user profile avatar upload", "DEEP-2042-implement-user"),
        # Only the first 15 characters of the title are used.
        ("DEEP-7", "Add export", "DEEP-7-add-export"),
        # Path separators, colons and the rest cannot survive into a folder name.
        # Only the first 15 title characters are taken, hence the cut after "h".
        ("DEEP-1", "a/b\\c:d*e?f<g>h|i", "DEEP-1-a-b-c-d-e-f-g-h"),
        # Windows refuses a bare device name, whatever the extension. A name
        # that merely starts with one ("PRN-aux") is legal and stays as it is.
        ("CON", "", "_CON"),
        ("NUL", "", "_NUL"),
        ("PRN", "aux", "PRN-aux"),
        # Trailing dots and spaces are illegal on Windows.
        ("DEEP-9", "trailing...   ", "DEEP-9-trailing"),
        # Nothing usable still yields a name.
        ("", "", "untitled"),
        ("", "!!!", "untitled"),
    ],
)
def test_story_folder_names_are_portable(jira, title, expected):
    assert safe_folder_name(jira, title) == expected


def test_story_folder_names_contain_no_illegal_characters():
    name = safe_folder_name("DEEP-2042", 'weird: "name" <with> every/thing\\bad|here?*')
    assert not set(name) & set('<>:"/\\|?*')
    assert name == name.strip(". ")


def test_artifacts_land_in_the_story_folder(ctx):
    ctx.artifacts.bind_story("DEEP-2042", "Implement user profile avatar upload")

    md = ctx.artifacts.write(5, "brd", "# BRD", ext="md", output_class="specification")
    pdf = ctx.artifacts.write(5, "brd", b"%PDF-1.4", ext="pdf", output_class="document")
    js = ctx.artifacts.write(5, "brd", {"ok": True}, ext="json")

    folder = ctx.artifacts.root / "DEEP-2042-implement-user"
    assert folder.is_dir()
    for uri in (md, pdf, js):
        path = ctx.artifacts.local_path(uri)
        assert path.parent == folder, uri
        assert path.is_file()

    # The index records the folder, so readers never have to guess it.
    assert all(e["dir"] == "DEEP-2042-implement-user" for e in ctx.artifacts.index())


def test_the_index_stays_at_the_job_root(ctx):
    """The index is about the run, not about one story inside it."""
    ctx.artifacts.bind_story("DEEP-2042", "Anything at all")
    ctx.artifacts.write(1, "jira_story", {"key": "DEEP-2042"}, ext="json")
    assert ctx.artifacts.index_path.parent == ctx.artifacts.root


def test_files_written_before_binding_still_resolve(ctx):
    early = ctx.artifacts.write(1, "jira_story", {"key": "DEEP-1"}, ext="json")
    ctx.artifacts.bind_story("DEEP-1", "Later title")
    late = ctx.artifacts.write(2, "story_analysis", {"ok": True}, ext="json")

    assert ctx.artifacts.local_path(early).is_file()
    assert ctx.artifacts.local_path(late).is_file()
    assert ctx.artifacts.read_json(early) == {"key": "DEEP-1"}


def test_versioning_spans_the_story_folder(ctx):
    """A version must not be handed out twice because the folder changed."""
    first = ctx.artifacts.write(5, "brd", "# one", ext="md", output_class="specification")
    ctx.artifacts.bind_story("DEEP-1", "Some title")
    second = ctx.artifacts.write(5, "brd", "# two", ext="md", output_class="specification")

    assert first.endswith("v1.md")
    assert second.endswith("v2.md")


def test_a_resumed_run_keeps_writing_to_the_same_folder(cfg, ctx):
    ctx.artifacts.bind_story("DEEP-1042", "Allow users to export")
    ctx.artifacts.write(1, "jira_story", {"key": "DEEP-1042"}, ext="json")

    reopened = ArtifactStore(cfg, ctx.job_id)
    assert reopened.story_dir == "DEEP-1042-allow-users-to"
    uri = reopened.write(2, "story_analysis", {"ok": True}, ext="json")
    assert reopened.local_path(uri).parent.name == "DEEP-1042-allow-users-to"


def test_the_pipeline_binds_the_folder_from_the_ticket(cfg):
    """Step 01 is the first moment the title is known, so it binds there."""
    from codegen_core.orchestrator.runner import PipelineRunner

    ctx = JobContext.create(cfg, "DEEP-1042")
    PipelineRunner(cfg).run(ctx, stop=5)

    folders = {p.name for p in ctx.artifacts.root.iterdir() if p.is_dir()}
    assert len(folders) == 1, folders
    folder = folders.pop()
    assert folder.startswith("DEEP-1042-")

    # Every artifact of the run, whatever its extension, is in that one folder.
    index = ctx.artifacts.index()
    assert {e["ext"] for e in index} >= {"json", "md"}
    assert all(e["dir"] == folder for e in index)
    assert all((ctx.artifacts.root / folder / e["file"]).is_file() for e in index)


# --------------------------------------------------------------------------- #
# the project path
# --------------------------------------------------------------------------- #
def configured(raw_config, tmp_path, **project):
    """A config whose project block is whatever the test needs."""
    raw_config["app"]["project"] = project
    path = tmp_path / "config.json"
    path.write_text(json.dumps(raw_config))
    return ConfigLoader.load(path)


def test_an_unset_project_path_falls_back_to_the_workspace(cfg, tmp_path):
    assert not cfg.app.project.path
    resolved = cfg.validate_project_path("DEEP-1042-abc")
    assert resolved == Path(cfg.app.paths.workspace.format(job_id="DEEP-1042-abc"))
    # The workspace is scratch space the run creates, so absence is not an error.
    assert not resolved.exists()


def test_a_configured_project_path_is_what_the_run_edits(raw_config, tmp_path, monkeypatch):
    monkeypatch.setenv("CODEGEN_PROFILE", "local")
    project = tmp_path / "checkout"
    project.mkdir()
    cfg = configured(raw_config, tmp_path, path=str(project))

    assert cfg.validate_project_path() == project
    ctx = JobContext.create(cfg, "DEEP-1042")
    assert ctx.workspace == project


def test_a_missing_project_path_names_the_key_and_the_path(raw_config, tmp_path, monkeypatch):
    monkeypatch.setenv("CODEGEN_PROFILE", "local")
    missing = tmp_path / "nope"
    with pytest.raises(ConfigError) as excinfo:
        configured(raw_config, tmp_path, path=str(missing))

    message = str(excinfo.value)
    assert "app.project.path" in message
    assert str(missing) in message
    assert "must_exist" in message  # tells the reader how to proceed


def test_a_file_is_not_a_project(raw_config, tmp_path, monkeypatch):
    monkeypatch.setenv("CODEGEN_PROFILE", "local")
    not_a_dir = tmp_path / "a-file.txt"
    not_a_dir.write_text("x")
    with pytest.raises(ConfigError, match="not a directory"):
        configured(raw_config, tmp_path, path=str(not_a_dir))


def test_an_unwritable_project_is_refused(raw_config, tmp_path, monkeypatch):
    monkeypatch.setenv("CODEGEN_PROFILE", "local")
    locked = tmp_path / "readonly"
    locked.mkdir(mode=0o500)
    try:
        with pytest.raises(ConfigError, match="not writable"):
            configured(raw_config, tmp_path, path=str(locked))
    finally:
        locked.chmod(0o700)


def test_must_exist_false_lets_the_run_create_it(raw_config, tmp_path, monkeypatch):
    monkeypatch.setenv("CODEGEN_PROFILE", "local")
    fresh = tmp_path / "created-later"
    cfg = configured(raw_config, tmp_path, path=str(fresh), must_exist=False)

    JobContext.create(cfg, "DEEP-1042")
    assert fresh.is_dir()


def test_the_job_id_can_be_templated_into_the_path(raw_config, tmp_path, monkeypatch):
    monkeypatch.setenv("CODEGEN_PROFILE", "local")
    cfg = configured(raw_config, tmp_path, path=str(tmp_path / "repos" / "{job_id}"), must_exist=False)
    ctx = JobContext.create(cfg, "DEEP-1042")
    assert ctx.workspace.name == ctx.job_id


# --------------------------------------------------------------------------- #
# the sample config
# --------------------------------------------------------------------------- #
SAMPLE = ROOT / "config" / "samples" / "visualization.variants.sample.json"


def test_every_sample_variant_can_be_pasted_into_config(raw_config, tmp_path, monkeypatch):
    """The promise the sample file makes: copy a block, change nothing, it loads."""
    monkeypatch.setenv("CODEGEN_PROFILE", "local")
    sample = json.loads(SAMPLE.read_text())
    variants = sample["visualization"]["variants"]
    assert len(variants) >= 8

    for variant_id, block in variants.items():
        raw_config["visualization"] = {"default_variant": variant_id, "variants": {variant_id: block}}
        path = tmp_path / f"config-{variant_id}.json"
        path.write_text(json.dumps(raw_config))
        cfg = ConfigLoader.load(path)

        loaded = cfg.visualization.variants[variant_id]
        assert loaded.label
        assert loaded.palette.accent.startswith("#")


def test_the_sample_project_block_is_the_real_shape(raw_config, tmp_path, monkeypatch):
    monkeypatch.setenv("CODEGEN_PROFILE", "local")
    sample = json.loads(SAMPLE.read_text())
    project = sample["app"]["project"]
    assert set(project) == {"path", "must_exist", "must_be_writable"}

    # The sample path is a placeholder, so point it somewhere real and load it.
    project = {**project, "path": str(tmp_path)}
    cfg = configured(raw_config, tmp_path, **project)
    assert cfg.validate_project_path() == tmp_path


def test_the_shipped_config_uses_a_sample_variant(raw_config):
    """config.json and the sample must not describe different logistics."""
    sample = json.loads(SAMPLE.read_text())["visualization"]["variants"]["logistics"]
    shipped = raw_config["visualization"]["variants"]["logistics"]
    assert shipped["headline"] == sample["headline"]
    assert shipped["palette"] == sample["palette"]
