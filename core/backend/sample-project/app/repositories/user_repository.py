"""User persistence.

An in-memory store stands in for the database so the sample runs with no
services attached. The interface is the part that matters: everything above
this layer talks to these four methods and never to a connection.
"""

from __future__ import annotations

from datetime import UTC, datetime

from ..models.user import User

_SEED = [
    User(
        id="usr_8fa21c",
        email="priya.raman@acme.test",
        display_name="Priya Raman",
        created_at=datetime(2025, 3, 14, 9, 30, tzinfo=UTC),
    ),
    User(
        id="usr_3b70de",
        email="tom.okafor@acme.test",
        display_name="Tom Okafor",
        created_at=datetime(2025, 7, 2, 16, 5, tzinfo=UTC),
        avatar_url="/media/avatars/usr_3b70de.png",
    ),
]


class UserRepository:
    def __init__(self) -> None:
        self._users: dict[str, User] = {u.id: u.model_copy() for u in _SEED}

    def get(self, user_id: str) -> User | None:
        return self._users.get(user_id)

    def list(self) -> list[User]:
        return sorted(self._users.values(), key=lambda u: u.created_at)

    def save(self, user: User) -> User:
        self._users[user.id] = user
        return user

    def exists(self, user_id: str) -> bool:
        return user_id in self._users


#: Single process-wide instance; swapped for a session-scoped one under a real DB.
user_repository = UserRepository()
