## Component Specification

### Name & Purpose
`Idempotency` — makes a retried `POST /api/products` safe, so a network timeout
followed by a retry creates one product rather than two.

### Location
`src/main/java/com/idol/api/Idempotency.java`

### Public Interface

```java
@Component
class Idempotency {
  static final String HEADER = "Idempotency-Key";

  record Key(String scope, String value, String requestHash) {}

  Key read(HttpServletRequest request, Jwt.Claims claims, Object body);  // null when absent
  Map<String, Object> claimOrReplay(Key key);   // null when this call owns the work
  void complete(Key key, String responseBody);
  void release(Key key);
}
```

### Dependencies
- Internal: `ApiException`, `Jwt.Claims`.
- Table: `idempotency_records` — shared with the Go API.

### Data Models

| Column | Use |
| --- | --- |
| `scope` | `user:{id}:{METHOD}:{path}` |
| `idempotency_key` | the caller's header, max 128 chars |
| `request_hash` | SHA-256 of the body, `CHAR(64)` |
| `state` | `processing` or `complete` — enforced by a CHECK |
| `response_body` | `bytea`, the JSON to replay |
| `expires_at` | 24 hours out |

### Business Rules & Constraints

**The INSERT is the lock.** The unique index on `(scope, idempotency_key)` means
two simultaneous retries cannot both claim the key; the loser catches
`DuplicateKeyException` and reads the row. No `SELECT` then `INSERT`, which would
have a window between them.

**Four outcomes, each with its own answer:**

| Situation | Answer |
| --- | --- |
| First use | claim it and run the handler |
| Same key, same body | replay the stored response, `Idempotent-Replay: true` |
| Same key, different body | 409 `IDEMPOTENCY_KEY_REUSED` |
| First attempt still running | 409 `REQUEST_IN_PROGRESS` |

A reused key with a different body is a client bug; returning the old response
would hide it.

**Keys are scoped per user and per route.** Two users sending the same key are
not making the same request, and neither are two different endpoints.

**A failed handler releases the claim:**

```java
} catch (RuntimeException e) {
  if (key != null) idempotency.release(key);
  throw e;
}
```

Without this, a request that failed validation would block the same key for
twenty-four hours, so a corrected retry would be answered "still processing".

**The state value is `complete`, not `completed`.** The table's CHECK constraint
allows `processing` and `complete` only — writing `completed` throws, the record
stays `processing`, and every retry gets `REQUEST_IN_PROGRESS` forever. That
happened during development and is why the failure is now logged rather than
silently swallowed.

**`request_hash` is compared after `trim()`.** The column is `CHAR(64)`, which
PostgreSQL pads with spaces.

### Extension Points
- **Idempotent PATCH or DELETE** — the component is route-agnostic; the scope
  already includes the method and path.
- **Expiry** — `expires_at` is written and never read. Nothing deletes old
  records, because this app has no background worker; the Go API's maintenance
  job is what clears them.
