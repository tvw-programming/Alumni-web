"""Application entry point."""

from __future__ import annotations

import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from .api.users import router as users_router

app = FastAPI(
    title="Acme profile service",
    version="0.3.0",
    description="Read and update user profiles.",
)

app.include_router(users_router)

# Uploaded media is served straight from disk in development.
MEDIA_ROOT = Path(os.getenv("MEDIA_ROOT", "media"))
MEDIA_ROOT.mkdir(parents=True, exist_ok=True)
app.mount("/media", StaticFiles(directory=MEDIA_ROOT), name="media")


@app.get("/health", tags=["ops"])
def health() -> dict[str, str]:
    return {"status": "ok", "service": "profile", "version": app.version}
