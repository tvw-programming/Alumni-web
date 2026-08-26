"""User profile routes.

One router per resource, all under /api/v1 — the convention the rest of the
service follows.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..deps import subject_id
from ..models.user import UserProfile
from ..services.user_service import NotAuthorised, UserNotFound, user_service

router = APIRouter(prefix="/api/v1/users", tags=["users"])


class DisplayNameUpdate(BaseModel):
    display_name: str


@router.get("", response_model=list[UserProfile], summary="List profiles")
def list_users() -> list[UserProfile]:
    return user_service.list_profiles()


@router.get("/{user_id}", response_model=UserProfile, summary="Read one profile")
def get_user(user_id: str) -> UserProfile:
    try:
        return user_service.get_profile(user_id)
    except UserNotFound as exc:
        raise HTTPException(404, f"No user with id {user_id}") from exc


@router.patch("/{user_id}/display-name", response_model=UserProfile, summary="Rename yourself")
def update_display_name(
    user_id: str,
    body: DisplayNameUpdate,
    caller: str = Depends(subject_id),
) -> UserProfile:
    try:
        return user_service.update_display_name(caller, user_id, body.display_name)
    except NotAuthorised as exc:
        raise HTTPException(403, "You can only change your own profile.") from exc
    except UserNotFound as exc:
        raise HTTPException(404, f"No user with id {user_id}") from exc
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc


# DEEP-2041 adds avatar upload, replace and remove routes below this line.
