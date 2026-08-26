"""User business logic.

Authorisation lives here rather than in the router, so every caller gets the
same rule whether it arrives over HTTP or from a background job.
"""

from __future__ import annotations

from ..models.user import User, UserProfile
from ..repositories.user_repository import UserRepository, user_repository


class UserNotFound(Exception):
    """No user with that id."""


class NotAuthorised(Exception):
    """The caller is acting on someone else's account."""


class UserService:
    def __init__(self, repository: UserRepository | None = None) -> None:
        self.repository = repository or user_repository

    def get_profile(self, user_id: str) -> UserProfile:
        user = self.repository.get(user_id)
        if user is None:
            raise UserNotFound(user_id)
        return UserProfile.of(user)

    def list_profiles(self) -> list[UserProfile]:
        return [UserProfile.of(u) for u in self.repository.list()]

    def authorise(self, subject_id: str, target_id: str) -> User:
        """Confirm the caller is acting on their own account, and return it.

        Every write path calls this first. The check is a single method so that
        adding an admin override later is one change, not a search.
        """
        if subject_id != target_id:
            raise NotAuthorised(f"{subject_id} may not modify {target_id}")
        user = self.repository.get(target_id)
        if user is None:
            raise UserNotFound(target_id)
        return user

    def update_display_name(self, subject_id: str, target_id: str, name: str) -> UserProfile:
        user = self.authorise(subject_id, target_id)
        cleaned = name.strip()
        if not cleaned:
            raise ValueError("display name cannot be empty")
        updated = user.model_copy(update={"display_name": cleaned})
        return UserProfile.of(self.repository.save(updated))


user_service = UserService()
