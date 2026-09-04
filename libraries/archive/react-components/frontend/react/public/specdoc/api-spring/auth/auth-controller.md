## Component Specification

### Name & Purpose

`AuthController` — every session endpoint, plus the permission check the product
routes call. Sign in, refresh, sign out, identify, and password reset.

### Location

`src/main/java/com/idol/api/AuthController.java`

### Public Interface

```java
@RestController
@RequestMapping("/api/auth")
class AuthController {
  @PostMapping("/login")            ResponseEntity<Map<String, Object>> login(LoginRequest in, HttpServletRequest request);
  @PostMapping("/refresh")          ResponseEntity<Map<String, Object>> refresh(String cookie);
  @PostMapping("/logout")           ResponseEntity<Map<String, Object>> logout(String cookie);
  @GetMapping("/me")                Map<String, Object> me(HttpServletRequest request);
  @PostMapping("/forgot-password")  Map<String, Object> forgotPassword(EmailRequest in, HttpServletRequest request);
  @PostMapping("/reset-password")   Map<String, Object> resetPassword(ResetRequest in, HttpServletRequest request);

  // Used by ProductController.
  Jwt.Claims requirePermission(HttpServletRequest request, String permission);
  Jwt.Claims requireClaims(HttpServletRequest request);
  static String text(Object value);   // unwraps a CITEXT PGobject
}

record LoginRequest(String email, String password, boolean rememberMe) {}
record ResetRequest(String token, String password) {}
record EmailRequest(String email) {}
```

### Dependencies

- Internal: `Jwt`, `RateLimiter`, `ApiException`.
- Spring: `JdbcTemplate`, `BCryptPasswordEncoder`, `ResponseCookie`.
- Tables: `users`, `refresh_tokens`, `password_reset_tokens`.

### Data Models

Login response:

```json
{
  "token": "<jwt>",
  "expiresIn": 900,
  "user": { "id": 1, "email": "admin@gmail.com", "displayName": "Ada Admin", "role": "admin" }
}
```

Refresh cookie: `idol_refresh`, httpOnly, `SameSite=Lax`, path `/`, 7 days or 30
with `rememberMe`.

Capability table:

```java
private static final Map<String, Set<String>> ROLE_PERMISSIONS = Map.of(
    "admin", Set.of("products:create", "products:update", "products:delete"),
    "user", Set.of());
```

### Business Rules & Constraints

**The access token is short-lived and the refresh token is revocable.** A JWT
cannot be withdrawn before it expires, so it gets fifteen minutes; the refresh
token can be revoked, so it is the one that persists — in an httpOnly cookie, out
of reach of any script on the page.

**One message for "no such account" and "wrong password"**, and the same work
either way:

```java
if (rows.isEmpty()) {
  passwords.matches(in.password(), DUMMY_HASH);   // equal timing
  throw invalidCredentials();
}
```

Without the dummy verify, response _time_ reveals which addresses are
registered — the timing version of the leak the shared message closes.

**Five failed attempts freeze the account for fifteen minutes.** The counter is
on the row, not in memory, so a restart or a second instance cannot reset an
attacker's budget:

```sql
UPDATE users
SET failed_login_attempts = failed_login_attempts + 1,
    locked_until = CASE WHEN failed_login_attempts + 1 >= ? THEN ? ELSE locked_until END
WHERE id = ?
```

A correct password during the freeze is still refused, with `ACCOUNT_LOCKED`.

**A disabled account gets its own code.** Telling a disabled user their password
was wrong sends them to reset it, which will not help.

**Refresh rotates.** The presented token is revoked and a new one issued in the
same call, so a stolen refresh token stops working at the next legitimate use.

**Refresh and reset tokens are stored as SHA-256 hashes.** Unsalted SHA-256 is
right here and wrong for passwords: these values are 32 random bytes, so there
is nothing to guess, and a database leak does not hand over live sessions.

**Logout clears the cookie unconditionally**, even when the token was already
revoked — otherwise the browser keeps sending a dead cookie forever.

**`forgot-password` always answers the same**, registered or not. With no mailer
configured the link is printed to the log, which is the honest version of "an
email was sent" for a demonstration app.

**A password reset revokes every session for that user.** Whoever set the
password gets the account.

**`email` is read through `text()`.** The column is `CITEXT`, which the driver
returns as a `PGobject`; serialized directly it becomes
`{"type":"citext","value":"…"}` instead of a string.

### Extension Points

- **A new role** — one entry in `ROLE_PERMISSIONS`; every route already asks for
  capabilities rather than role names.
- **A new capability** — add it to the set and pass the string to
  `requirePermission`.
- **Sign out everywhere** — `refresh_tokens` already records `user_agent` and
  `ip_address`; nothing reads them yet.
