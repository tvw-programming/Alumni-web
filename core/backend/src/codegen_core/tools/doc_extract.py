"""Uploaded document to markdown text.

The inverse of doc_render: that module turns markdown into the .pdf/.docx an
artifact rule demands, this one turns a human's file back into the markdown the
pipeline reasons over. Only used when a person hands the run a document — the
model never produces bytes that need extracting.

Extractors are optional dependencies, exactly as the renderers are, but the
failure mode is different: rendering may degrade to a minimal file because the
content is already known, whereas a document we cannot read has no content at
all. So this raises rather than guessing, and the message names the format the
gate can always accept.
"""

from __future__ import annotations

from ..core.errors import DocumentRejected

#: What the extractors below can turn into markdown, given their dependencies.
EXTRACTABLE = ("md", "markdown", "txt", "pdf", "docx")


def extract_markdown(data: bytes, ext: str) -> str:
    """Return the markdown body of an uploaded document.

    Raises DocumentRejected when the bytes cannot be read at all, including the
    case where the extractor for that format is not installed.
    """
    ext = ext.lstrip(".").lower()
    if ext in ("md", "markdown", "txt"):
        return _text(data)
    if ext == "pdf":
        return _from_pdf(data)
    if ext == "docx":
        return _from_docx(data)
    raise DocumentRejected(
        f"'.{ext}' is not a document this gate can read; upload one of {', '.join(EXTRACTABLE)}"
    )


def _text(data: bytes) -> str:
    try:
        return data.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise DocumentRejected(
            "the file is not valid UTF-8 text; save it as UTF-8 markdown and upload again"
        ) from exc


def _from_pdf(data: bytes) -> str:
    try:
        import fitz  # type: ignore
    except ImportError as exc:
        raise DocumentRejected(
            "this deployment cannot read PDFs (pymupdf is not installed). "
            "Upload the markdown source instead — it is what the pipeline reads anyway."
        ) from exc

    try:
        with fitz.open(stream=data, filetype="pdf") as doc:
            pages = [page.get_text() for page in doc]
    except Exception as exc:
        # Every parse failure has the same answer for the uploader, and the
        # extractor's own exception types are not ours to enumerate.
        raise DocumentRejected(f"the PDF could not be read: {exc}") from exc
    return "\n\n".join(pages)


def _from_docx(data: bytes) -> str:
    try:
        from io import BytesIO

        from docx import Document  # type: ignore
    except ImportError as exc:
        raise DocumentRejected(
            "this deployment cannot read .docx (python-docx is not installed). "
            "Upload the markdown source instead — it is what the pipeline reads anyway."
        ) from exc

    try:
        doc = Document(BytesIO(data))
    except Exception as exc:
        raise DocumentRejected(f"the .docx could not be read: {exc}") from exc

    # Headings and bullets carry the structure the BRD parser looks for, so they
    # are mapped back to markdown rather than flattened into paragraphs.
    lines = []
    for para in doc.paragraphs:
        text = para.text.strip()
        if not text:
            lines.append("")
            continue
        style = (para.style.name or "").lower()
        if style.startswith("heading"):
            level = "".join(c for c in style if c.isdigit()) or "1"
            lines.append("#" * min(int(level) + 1, 6) + f" {text}")
        elif style.startswith("title"):
            lines.append(f"# {text}")
        elif "list" in style:
            lines.append(f"- {text}")
        else:
            lines.append(text)
    return "\n".join(lines)
