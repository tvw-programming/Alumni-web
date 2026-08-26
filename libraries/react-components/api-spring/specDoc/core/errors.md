## Component Specification

### Name & Purpose
`ApiException` and `ErrorHandler` — the single failure shape every endpoint
returns, and the codes callers switch on.

### Location
`src/main/java/com/idol/api/ApiException.java`,
`src/main/java/com/idol/api/ErrorHandler.java`

### Public Interface

```java
class ApiException extends RuntimeException {
  final HttpStatus status;
  final String code;

  static ApiException badRequest(String code, String message);
  static ApiException unauthenticated(String message);   // 401 UNAUTHENTICATED
  static ApiException forbidden(String message);         // 403 FORBIDDEN
  static ApiException notFound(String message);          // 404 NOT_FOUND
  static ApiException conflict(String code, String message);
}

@RestControllerAdvice
class ErrorHandler {
  ResponseEntity<Map<String, Object>> handleApi(ApiException e, HttpServletRequest request);
  ResponseEntity<Map<String, Object>> handleBadJson(HttpServletRequest request);
  ResponseEntity<Map<String, Object>> handleMissing(HttpServletRequest request);
  ResponseEntity<Map<String, Object>> handleUnknown(Exception e, HttpServletRequest request);
}
```

### Dependencies
- Internal: `RequestId`, for the id included in every body.
- Spring MVC exception handling. Nothing else.

### Data Models

```json
{"error": {"code": "VERSION_CONFLICT", "message": "…", "requestId": "…"}}
```

Codes in use, matching the Go API verbatim:

| Code | Status | Raised when |
| --- | --- | --- |
| `VALIDATION_FAILED` | 422 | required fields missing |
| `VALIDATION_ERROR` | 400 | a database CHECK rejected the row |
| `INVALID_BODY` | 400 | unparseable JSON, or no known fields |
| `INVALID_CREDENTIALS` | 401 | wrong password *or* unknown account |
| `UNAUTHENTICATED` | 401 | no Bearer token, or it does not verify |
| `NO_SESSION` | 401 | refresh called with no cookie |
| `INVALID_REFRESH_TOKEN` | 401 | cookie revoked, expired or unknown |
| `ACCOUNT_DISABLED` | 403 | `is_active` is false |
| `FORBIDDEN` | 403 | authenticated, but the role lacks the permission |
| `ACCOUNT_LOCKED` | 429 | five failed attempts |
| `RATE_LIMITED` | 429 | more than 10 credential requests a minute from one IP |
| `WEAK_PASSWORD` | 400 | reset password under 8 characters |
| `INVALID_RESET_TOKEN` | 400 | reset token unknown, used or expired |
| `NOT_FOUND` | 404 | no such row, or no such route |
| `INVALID_CURSOR` | 400 | malformed cursor, or keyset on a non-default sort |
| `INVALID_IF_MATCH` | 400 | `If-Match` is not a positive integer |
| `VERSION_CONFLICT` | 412 | `If-Match` did not hold |
| `DUPLICATE_PRODUCT_ID` | 409 | `products_product_id_unique` violated |
| `IDEMPOTENCY_KEY_REUSED` | 409 | same key, different body |
| `REQUEST_IN_PROGRESS` | 409 | the first attempt with this key is still running |
| `INTERNAL` | 500 | anything unhandled |

### Business Rules & Constraints

**The message for a 500 is fixed text.** An exception message can carry a SQL
fragment, a file path or a hostname, and none of those belong in a client
response. The detail is logged with the request id, which is how the two are
connected:

```java
System.out.println("[error] id=" + RequestId.of(request) + " " + e);
```

**401 and 403 are different answers.** The first means "who are you", the second
means "I know who you are, and no". Collapsing them either hides a fixable
client bug or leaks whether a resource exists.

**412 rather than 409 for a failed precondition.** The caller stated a condition
(`If-Match`) and it did not hold. 409 is reserved for a conflict where no
precondition was given.

**Unparseable JSON is 400, not 500.** It is the caller's mistake, and a 500
would suggest retrying.

### Extension Points
- **A new code** — add a static factory or construct `ApiException` directly;
  `ErrorHandler` needs no change.
- **Field-level validation errors** — the envelope has no `details` array. The
  Go API's validator produces one; adding it here means a new field in the body.
