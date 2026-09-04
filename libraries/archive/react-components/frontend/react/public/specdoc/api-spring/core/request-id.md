## Component Specification

### Name & Purpose

`RequestId` and `RateLimiter` — the two servlet-level concerns: giving every
request a traceable id, and throttling the credential endpoints per IP.

### Location

`src/main/java/com/idol/api/RequestId.java`,
`src/main/java/com/idol/api/RateLimiter.java`

### Public Interface

```java
@Component
class RequestId implements Filter {
  static final String HEADER = "X-Request-Id";
  static final String ATTRIBUTE = "requestId";

  void doFilter(ServletRequest request, ServletResponse response, FilterChain chain);
  static String of(HttpServletRequest request);   // the current request's id
}

@Component
class RateLimiter {
  void check(String address);   // counts one attempt, or throws 429 RATE_LIMITED
}
```

### Dependencies

- `RequestId`: the servlet API only.
- `RateLimiter`: `ApiException`. No Redis, no bucket library.

### Data Models

`RateLimiter` holds one entry per address:

```java
private record Window(long minute, AtomicInteger count) {}
private final Map<String, Window> windows = new ConcurrentHashMap<>();
```

### Business Rules & Constraints

**A client-supplied `X-Request-Id` is honoured, capped at 64 characters.** Trace
continuity across the browser, the frontend and this API is the point; the cap
is there because the value is echoed into logs and headers, and an unbounded
string makes both unreadable.

**One log line per request**, written in a `finally` so a thrown exception still
produces it:

```
[req] GET /api/products 200 41ms id=3d35cac3-dd1d-4b6d-83a4-d5947dbc9384
```

That is the entire observability story here — no structured logging, no metrics,
no tracing. The Go API has OpenTelemetry; this deliberately does not.

**Ten credential attempts per minute per IP.** Fixed window, not sliding: a
caller can send twenty across a window boundary. A sliding window is better and
is not worth the machinery at this size.

**The limiter is per-instance and resets on restart.** The Go API has the same
property. It is the network-level companion to the per-account lockout in
`AuthController` — the lockout stops one account being ground down, this stops
one source spraying many accounts, and neither alone is enough.

**The map is swept when it exceeds 10,000 entries.** Without that it grows one
entry per address forever, which is a memory leak an attacker controls.

### Extension Points

- **Throttling another endpoint** — call `rateLimiter.check(...)` from it. The
  budget is shared across every caller of `check`, which is why only the
  credential endpoints use it today.
- **Sharing the budget across replicas** — would need external state; the
  `Map` is the only thing to replace.
