"""Request dependencies.

Authentication is stubbed to a header so the sample runs without an identity
provider. `subject_id` is the only thing the rest of the app needs from it.
"""

from __future__ import annotations

from fastapi import Header, HTTPException


def subject_id(x_user_id: str | None = Header(default=None, alias="X-User-Id")) -> str:
    """The authenticated caller.

    A real deployment replaces this with token verification; everything
    downstream keeps the same signature.
    """
    if not x_user_id:
        raise HTTPException(
            status_code=401,
            detail="Sign in to continue. Send an X-User-Id header to identify yourself.",
        )
    return x_user_id
