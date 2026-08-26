"""Failure snapshots.

The artifact convention says errors and visual snapshots are .jpg. When a real
screenshot exists (Playwright, ZAP) we copy it; when the failure is textual we
render it to an image so the convention still holds and the evidence is
viewable in the dashboard alongside visual failures.
"""

from __future__ import annotations

from pathlib import Path


def capture_text_failure(message: str, width: int = 1000, height: int = 600) -> bytes:
    try:
        from PIL import Image, ImageDraw

        img = Image.new("RGB", (width, height), "white")
        draw = ImageDraw.Draw(img)
        y = 20
        for line in message.splitlines()[:34]:
            draw.text((20, y), line[:120], fill="black")
            y += 16
        from io import BytesIO

        buf = BytesIO()
        img.save(buf, format="JPEG", quality=85)
        return buf.getvalue()
    except ImportError:
        return _minimal_jpeg()


def _minimal_jpeg() -> bytes:
    """1x1 white JPEG - a valid placeholder when Pillow is unavailable."""
    return bytes.fromhex(
        "ffd8ffe000104a46494600010100000100010000ffdb004300ffffffffffffffffffffffffffffff"
        "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
        "ffffffffffffffffffffffffffffffffffffffc00011080001000103012200021101031101ffc400"
        "1f0000010501010101010100000000000000000102030405060708090a0bffc400b5100002010303"
        "020403050504040000017d01020300041105122131410613516107227114328191a1082342b1c115"
        "52d1f02433627282090a161718191a25262728292a3435363738393a434445464748494a53545556"
        "5758595a636465666768696a737475767778797a838485868788898a92939495969798999aa2a3a4"
        "a5a6a7a8a9aab2b3b4b5b6b7b8b9bac2c3c4c5c6c7c8c9cad2d3d4d5d6d7d8d9dae1e2e3e4e5e6e7"
        "e8e9eaf1f2f3f4f5f6f7f8f9faffda0008010100003f00fbfeffd9"
    )


def copy_screenshot(src: Path) -> bytes:
    return Path(src).read_bytes()
