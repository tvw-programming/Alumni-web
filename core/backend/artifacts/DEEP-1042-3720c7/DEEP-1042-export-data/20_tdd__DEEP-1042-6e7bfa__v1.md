# Technical Design Document (as built)

## Architecture

One new service class behind the existing users router
## Sequence / Data Flow

- client -> api -> service -> repository -> csv
## APIs

- POST /api/v1/users/{id}/export
## Database Changes

- (none)
## Impacted Files

- app/api/users.py
- app/services/exporter.py
## Decisions

- synchronous export for v1; async job if rows exceed 50k
## Tests

- (none)
## Security Considerations

- ownership check
- no PII in logs
