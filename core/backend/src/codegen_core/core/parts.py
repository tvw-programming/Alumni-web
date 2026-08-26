"""A2A payload parts - the modality layer.

A Part is one piece of content moving between components. Senders never care
what the receiver can read; negotiate.adapt() handles conversion. Large binary
content is referenced by artifact URI, never inlined.
"""

from __future__ import annotations

import hashlib
from enum import Enum
from typing import Annotated, Any, Literal, Union

from pydantic import BaseModel, Field


class Modality(str, Enum):
    TEXT = "text"
    JSON = "json"
    IMAGE = "image"
    FILE = "file"
    DIFF = "diff"


class PartBase(BaseModel):
    mime_type: str
    name: str | None = None
    sha256: str | None = None
    bytes_len: int | None = None

    def fingerprint(self, payload: bytes) -> str:
        return hashlib.sha256(payload).hexdigest()


class TextPart(PartBase):
    modality: Literal[Modality.TEXT] = Modality.TEXT
    mime_type: str = "text/plain"
    text: str

    def sized(self) -> "TextPart":
        raw = self.text.encode()
        return self.model_copy(update={"sha256": self.fingerprint(raw), "bytes_len": len(raw)})


class JsonPart(PartBase):
    """Structured data with a declared schema id the receiver can validate against."""

    modality: Literal[Modality.JSON] = Modality.JSON
    mime_type: str = "application/json"
    schema_id: str
    data: dict[str, Any]


class BlobPart(PartBase):
    """Images, PDFs, DOCX, diffs, archives. Referenced by artifact:// URI."""

    modality: Literal[Modality.IMAGE, Modality.FILE, Modality.DIFF]
    uri: str
    inline_b64: str | None = None


Part = Annotated[Union[TextPart, JsonPart, BlobPart], Field(discriminator="modality")]


def text(body: str, name: str | None = None) -> TextPart:
    return TextPart(text=body, name=name)


def structured(schema_id: str, data: dict[str, Any], name: str | None = None) -> JsonPart:
    return JsonPart(schema_id=schema_id, data=data, name=name or schema_id)


def blob(uri: str, mime_type: str, modality: Modality = Modality.FILE, **kw: Any) -> BlobPart:
    return BlobPart(uri=uri, mime_type=mime_type, modality=modality, **kw)
