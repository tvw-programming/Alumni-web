"""The storage component DEEP-2042 is expected to reuse."""

import pytest

from app.services.storage import LocalFileStorage


def test_put_returns_a_public_url(tmp_path):
    s = LocalFileStorage(root=tmp_path)
    assert s.put("avatars/a.png", b"bytes") == "/media/avatars/a.png"
    assert s.exists("avatars/a.png")


def test_delete_reports_whether_anything_was_removed(tmp_path):
    s = LocalFileStorage(root=tmp_path)
    s.put("avatars/a.png", b"bytes")
    assert s.delete("avatars/a.png") is True
    assert s.delete("avatars/a.png") is False


def test_keys_cannot_escape_the_media_root(tmp_path):
    s = LocalFileStorage(root=tmp_path)
    with pytest.raises(ValueError, match="escapes the media root"):
        s.put("../../etc/passwd", b"nope")
