## Component Specification

### Name & Purpose
`Audit` — writes one row per successful mutation: who did what, to which row,
under which request.

### Location
`src/main/java/com/idol/api/Audit.java`

### Public Interface

```java
@Component
class Audit {
  void record(HttpServletRequest request, Long actorUserId, String action,
              String resourceId, Map<String, Object> metadata);
}
```

Actions written: `product.create`, `product.update`, `product.delete`.

### Dependencies
- Internal: `RequestId`.
- Table: `audit_events` — shared with the Go API.

### Data Models

```sql
INSERT INTO audit_events (actor_user_id, action, resource_type, resource_id,
                          request_id, ip_address, metadata)
VALUES (?, ?, 'product', ?, ?, ?::inet, ?::jsonb)
```

Metadata differs by action: `{"productId": "SKU-1001"}` on create,
`{"fields": ["price"]}` on update, `{}` on delete.

### Business Rules & Constraints

**Recorded after the change commits, and never allowed to fail the request:**

```java
} catch (Exception e) {
  System.out.println("[audit] failed to record " + action + ": " + e);
}
```

An audit write that rolls back the change it was recording is worse than no
audit at all — the change happened, and the record would say it did not. The
cost is the opposite failure: a mutation can succeed with no row written, and
only the log says so.

**The metadata is bound as text and cast in SQL** (`?::jsonb`) rather than as a
`PGobject`. Binding the driver's type would work and would mean importing a
driver class into application code; this way the driver stays a runtime
dependency.

**`ip_address` is `INET`.** Whatever the servlet container reports is written; if
this ever sits behind a proxy, that is the proxy's address unless a forwarded
header is read. Nothing reads one today.

**Only successful mutations are recorded.** A rejected write leaves no trace here
— the request log has it, the audit table does not. The Go API records at the
same point.

### Extension Points
- **Auditing another resource** — `resource_type` is hard-coded to `'product'`;
  it would become a parameter.
- **Auditing reads** — nothing prevents it, and the table's
  `(resource_type, resource_id, created_at DESC)` index would serve it.
- **Exposing the trail** — there is no endpoint that reads `audit_events`.
