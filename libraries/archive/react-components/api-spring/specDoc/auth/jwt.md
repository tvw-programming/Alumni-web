## Component Specification

### Name & Purpose
`Jwt` — HS256 access tokens, signed and verified by hand.

### Location
`src/main/java/com/idol/api/Jwt.java`

### Public Interface

```java
final class Jwt {
  Jwt(String secret);

  record Claims(long userId, String role) {}

  String sign(long userId, String role, long expiresAtEpochSeconds);
  Claims verify(String token);   // null when the token is invalid or expired
}
```

### Dependencies
- `javax.crypto.Mac`, `java.util.Base64`, Jackson (already present for the web
  layer). **No JWT library.**

### Data Models

Header and payload:

```json
{"alg":"HS256","typ":"JWT"}
{"sub":"1","role":"admin","exp":1785932052}
```

`sub` is a string because that is what the Go API emits, and the frontends read
both APIs' tokens the same way.

### Business Rules & Constraints

**`alg` is never read from the token being verified.** The signature is
recomputed over the received header and payload with the server's own algorithm
and key:

```java
byte[] expected = hmac(parts[0] + "." + parts[1]);
byte[] actual = DEC.decode(parts[2]);
if (!java.security.MessageDigest.isEqual(expected, actual)) return null;
```

A verifier that trusts the token's own `alg` accepts `{"alg":"none"}`, which is
the classic JWT break. Verified: a forged `alg:none` token is rejected with 401.

**The comparison is constant-time.** `MessageDigest.isEqual` does not return
early, so it does not leak how much of a forged signature was correct.

**A malformed token is an invalid token, not a server error.** Every parse
failure returns `null` and becomes a 401 — a 500 would tell the caller to retry
something that will never work.

**Expiry is checked here**, not by the caller, so no route can forget to.

**Fifteen lines instead of a dependency.** A JWT is three base64url segments and
an HMAC of the first two; a library would add a supply chain for that.

### Extension Points
- **More claims** — add to the map in `sign` and read them in `verify`; `Claims`
  is the only shape callers see.
- **Key rotation** — not supported. `Jwt` holds one secret, so rotating it
  invalidates every outstanding access token (fifteen minutes of them).
