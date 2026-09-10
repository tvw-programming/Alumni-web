# Feature Specification

Self-service CSV export of a user's own data

## API Contracts

- `POST /api/v1/users/{id}/export` -> 202 {job_id}
## Data Model

- (none)
## Validation

- id must equal the authenticated subject
## Errors

- 403: id != subject
## UI States

- idle
- requested
- ready
- failed
## Accessibility

- button has an accessible name
## Security

- ownership check before any read
## Acceptance Criteria

- AC-1
- AC-2
- AC-3
## Implementation Boundaries

- Only these paths may be touched: ['app/api/*', 'app/services/*', 'tests/*']
- Total changed lines must stay under 300
- No refactoring unrelated to the acceptance criteria
