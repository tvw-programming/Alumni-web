# syntax=docker/dockerfile:1.7

# ---------------------------------------------------------------------------
# CodeGen Core backend — pipeline runner, gate API, and the CLI.
#
# Built for linux/arm64 so it runs natively on Apple Silicon. Every base image
# and wheel below has an official arm64 build, so nothing falls back to QEMU.
# ---------------------------------------------------------------------------

FROM python:3.12-slim-bookworm AS base

# Python behaviour we want in every stage.
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# git is needed for the diff tools; tini reaps orphans so ctrl-C is clean.
RUN apt-get update \
 && apt-get install -y --no-install-recommends git curl tini \
 && rm -rf /var/lib/apt/lists/*


# --- dependency layer -------------------------------------------------------
# Split from the source so editing code does not reinstall the world.
FROM base AS deps

WORKDIR /app
COPY backend/pyproject.toml ./

# Dependencies only — the package itself is never pip-installed, because an
# installed copy would shadow the bind-mounted /app/src and silently ignore
# your edits. PYTHONPATH points at the mount instead.
# Every wheel below publishes manylinux_aarch64, so none of this compiles.
# pymupdf and python-docx are what let a reviewer answer a rejected gate with a
# .pdf or .docx; without them that upload is refused and .md still works.
RUN --mount=type=cache,target=/root/.cache/pip,sharing=locked \
    pip install --upgrade pip setuptools wheel \
 && pip install \
      "pydantic>=2.6" \
      "fastapi>=0.115" \
      "uvicorn[standard]>=0.30" \
      "httpx" \
      "pytest>=8" "pytest-cov" "pytest-json-report" \
      "reportlab" "pillow" \
      "pymupdf" "python-docx"


# --- runtime ----------------------------------------------------------------
FROM deps AS runtime

# Run as a non-root user whose uid matches the common macOS default, so files
# the agent writes into the mounted workspace stay editable on the host.
ARG UID=501
ARG GID=20
RUN groupadd -g "${GID}" -o codegen 2>/dev/null || true \
 && useradd -u "${UID}" -g "${GID}" -o -m -s /bin/bash codegen 2>/dev/null || true

WORKDIR /app

COPY backend/pyproject.toml backend/README.md ./
COPY backend/src ./src
COPY backend/config ./config
COPY backend/tests ./tests
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
COPY docker/gate_watcher.py /usr/local/bin/gate_watcher.py

RUN chmod +x /usr/local/bin/entrypoint.sh \
 && mkdir -p /data/artifacts /data/runs /stories /workspace \
 && chown -R "${UID}:${GID}" /app /data

ENV PYTHONPATH=/app/src \
    CODEGEN_CONFIG=/app/config/config.json \
    CODEGEN_PROFILE=docker \
    CODEGEN_STORY=DEEP-2041 \
    PATH="/home/codegen/.local/bin:${PATH}"

USER codegen
EXPOSE 8000

# The API is the readiness signal: the UI polls it, so it must answer before
# compose reports the service healthy.
HEALTHCHECK --interval=10s --timeout=3s --start-period=25s --retries=6 \
  CMD curl -fsS http://127.0.0.1:8000/api/health || exit 1

ENTRYPOINT ["/usr/bin/tini", "--", "/usr/local/bin/entrypoint.sh"]
CMD ["serve"]
