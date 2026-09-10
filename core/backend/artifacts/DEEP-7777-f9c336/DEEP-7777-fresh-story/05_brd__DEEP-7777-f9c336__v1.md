# Business Requirement Document

## User data export

### Background
Users need a self-service export of their own data.

### Objectives
- Self-service export
- No support ticket required

### In Scope
- CSV export of profile and orders

### Out of Scope
- PDF export
- Bulk admin export

### Acceptance Criteria
- **AC-1** An authenticated user can request an export of their own data
- **AC-2** The export contains profile and order history as CSV
- **AC-3** A user cannot request an export for another user

### Risks
- PII handling in the generated file

### Assumptions
- (none)
