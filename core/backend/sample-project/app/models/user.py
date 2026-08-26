"""User domain model.

Deliberately plain: the repository layer owns persistence, so this stays a
description of what a user is rather than how one is stored.
"""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class User(BaseModel):
    id: str
    email: str
    display_name: str
    created_at: datetime
    #: Absolute URL of the profile picture. None means the UI falls back to initials.
    avatar_url: str | None = None

    def initials(self) -> str:
        parts = [p for p in self.display_name.split() if p]
        return "".join(p[0].upper() for p in parts[:2]) or "?"


class UserProfile(BaseModel):
    """What the profile endpoint returns. Narrower than the model on purpose —
    internal fields should not leak just because they exist."""

    id: str
    display_name: str
    email: str
    avatar_url: str | None = None
    initials: str = Field(description="Fallback shown when there is no avatar")

    @classmethod
    def of(cls, user: User) -> "UserProfile":
        return cls(
            id=user.id,
            display_name=user.display_name,
            email=user.email,
            avatar_url=user.avatar_url,
            initials=user.initials(),
        )
