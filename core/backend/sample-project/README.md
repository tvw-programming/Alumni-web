# Acme profile service

The codebase CodeGen Core implements against. A small FastAPI service that reads and
updates user profiles.

```bash
pip install -r requirements-dev.txt
uvicorn app.main:app --reload    # http://localhost:8080
pytest
```

## Layout

```
app/
├── api/users.py              routes, one router per resource
├── services/user_service.py  business logic and authorisation
├── services/storage.py       file storage — reused by the avatar feature
├── repositories/             persistence; nothing above this holds a connection
├── models/user.py            domain model and the profile response shape
└── deps.py                   request dependencies (auth stub)
```

## Conventions

- Routes live under `/api/v1`, one router per resource.
- Authorisation is decided in the service layer, never in the router, so every
  caller gets the same rule.
- Repositories own persistence. Services never touch storage directly except
  through `services/storage.py`.
- Tests mirror the module they cover: `tests/test_<module>.py`.

## The open story

`stories/DEEP-2041.md` asks for avatar upload. The pieces it should build on
already exist: `LocalFileStorage` handles where a file lands and what URL points
at it, and `UserService.authorise` is the single place ownership is checked.
