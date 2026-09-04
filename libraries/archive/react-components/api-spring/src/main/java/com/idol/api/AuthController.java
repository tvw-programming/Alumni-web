package com.idol.api;

import jakarta.servlet.http.HttpServletRequest;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.http.HttpStatus;

/**
 * Sessions: sign in, refresh, sign out, who am I, and password reset.
 *
 * Two token types, as in the Go API:
 *
 * - the **access token** is a signed JWT, short-lived, returned in the response
 *   body for the client to hold in memory;
 * - the **refresh token** is an opaque random string in an httpOnly cookie,
 *   stored server-side as a SHA-256 hash.
 *
 * The split is the whole design. A JWT cannot be revoked before it expires, so
 * it is given a short life; the refresh token can be revoked, so it is the one
 * that persists — and it is never readable by JavaScript.
 */
@RestController
@RequestMapping("/api/auth")
class AuthController {

  private static final String COOKIE = "idol_refresh";
  private static final SecureRandom RANDOM = new SecureRandom();

  /**
   * Five attempts then a fifteen-minute freeze, matching the Go API: enough to
   * absorb a forgotten password, short enough that a locked-out user is not
   * stuck for long, and slow enough that online guessing is hopeless.
   */
  private static final int MAX_FAILED_ATTEMPTS = 5;
  private static final int LOCKOUT_MINUTES = 15;

  /**
   * A real bcrypt hash of a value nobody knows, verified when no account
   * matches so that a missing account costs the same time as a wrong password.
   * Without it, response time alone tells an attacker which addresses are
   * registered — the timing version of the enumeration leak the shared error
   * message closes.
   */
  private static final String DUMMY_HASH =
      "$2a$12$tA5TodHbCllq/IpxMySj3OThEkxCJYr4wxzvKzBM1./uG.TqZJJ9i";

  private final JdbcTemplate db;
  private final BCryptPasswordEncoder passwords;
  private final RateLimiter rateLimiter;
  private final Jwt jwt;
  private final int accessMinutes;
  private final int refreshDays;
  private final int rememberDays;
  private final boolean cookieSecure;

  AuthController(
      JdbcTemplate db,
      BCryptPasswordEncoder passwords,
      RateLimiter rateLimiter,
      @Value("${app.jwt-secret}") String secret,
      @Value("${app.access-token-minutes}") int accessMinutes,
      @Value("${app.refresh-token-days}") int refreshDays,
      @Value("${app.remember-me-days}") int rememberDays,
      @Value("${app.cookie-secure}") boolean cookieSecure) {
    this.db = db;
    this.passwords = passwords;
    this.rateLimiter = rateLimiter;
    this.jwt = new Jwt(secret);
    this.accessMinutes = accessMinutes;
    this.refreshDays = refreshDays;
    this.rememberDays = rememberDays;
    this.cookieSecure = cookieSecure;
  }

  record LoginRequest(String email, String password, boolean rememberMe) {}

  record ResetRequest(String token, String password) {}

  record EmailRequest(String email) {}

  @PostMapping("/login")
  ResponseEntity<Map<String, Object>> login(@RequestBody LoginRequest in, HttpServletRequest request) {
    rateLimiter.check(request.getRemoteAddr());

    if (in.email() == null || in.email().isBlank() || in.password() == null || in.password().isBlank()) {
      // 422, not 400: the body parsed fine, it just does not satisfy the rules.
      // The Go API's validator draws the same line.
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "VALIDATION_FAILED",
          "Email and password are required.");
    }

    List<Map<String, Object>> rows =
        db.queryForList("SELECT * FROM users WHERE email = ?", in.email());

    if (rows.isEmpty()) {
      // Same work, same time, same message as a wrong password.
      passwords.matches(in.password(), DUMMY_HASH);
      throw invalidCredentials();
    }

    Map<String, Object> user = rows.get(0);

    // Distinct from a credential failure on purpose: telling a disabled user
    // their password was wrong sends them to reset it, which will not help.
    if (!(Boolean) user.get("is_active")) {
      throw new ApiException(HttpStatus.FORBIDDEN, "ACCOUNT_DISABLED", "This account has been disabled.");
    }

    Object lockedUntil = user.get("locked_until");
    if (lockedUntil instanceof java.sql.Timestamp lock && lock.toInstant().isAfter(Instant.now())) {
      throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "ACCOUNT_LOCKED",
          "Too many failed attempts. Try again later.");
    }

    long userId = ((Number) user.get("id")).longValue();

    if (!passwords.matches(in.password(), (String) user.get("password_hash"))) {
      // The counter lives on the row, not in memory, so a restart or a second
      // instance cannot reset an attacker's budget.
      db.update(
          """
          UPDATE users
          SET failed_login_attempts = failed_login_attempts + 1,
              locked_until = CASE WHEN failed_login_attempts + 1 >= ? THEN ? ELSE locked_until END,
              updated_at = NOW()
          WHERE id = ?
          """,
          MAX_FAILED_ATTEMPTS,
          Timestamp.from(Instant.now().plus(LOCKOUT_MINUTES, ChronoUnit.MINUTES)),
          userId);
      throw invalidCredentials();
    }

    db.update(
        "UPDATE users SET last_login_at = NOW(), failed_login_attempts = 0, locked_until = NULL WHERE id = ?",
        userId);

    return session(user, in.rememberMe());
  }

  /**
   * One message for "no such account" and for "wrong password".
   *
   * Two different messages would turn this endpoint into a way to discover who
   * has an account here.
   */
  private static ApiException invalidCredentials() {
    return new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS",
        "Email or password is incorrect.");
  }

  /**
   * Exchanges the refresh cookie for a new access token, and replaces the
   * refresh token while doing so.
   *
   * Rotating on every use is what makes a stolen refresh token survivable: the
   * next legitimate refresh invalidates the copy the attacker holds.
   */
  @PostMapping("/refresh")
  ResponseEntity<Map<String, Object>> refresh(@CookieValue(name = COOKIE, required = false) String cookie) {
    if (cookie == null) {
      throw new ApiException(HttpStatus.UNAUTHORIZED, "NO_SESSION", "Not signed in.");
    }

    List<Map<String, Object>> rows = db.queryForList(
        """
        SELECT u.*, t.id AS token_id
        FROM refresh_tokens t
        JOIN users u ON u.id = t.user_id
        WHERE t.token_hash = ? AND t.revoked_at IS NULL AND t.expires_at > NOW() AND u.is_active
        """,
        sha256(cookie));

    if (rows.isEmpty()) {
      throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_REFRESH_TOKEN",
          "Session expired. Please sign in again.");
    }

    Map<String, Object> user = rows.get(0);
    db.update("UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = ?", user.get("token_id"));
    return session(user, false);
  }

  @PostMapping("/logout")
  ResponseEntity<Map<String, Object>> logout(@CookieValue(name = COOKIE, required = false) String cookie) {
    if (cookie != null) {
      db.update("UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = ?", sha256(cookie));
    }
    // Cleared unconditionally: signing out has to work even when the token was
    // already revoked, or the browser keeps sending a dead cookie forever.
    return ResponseEntity.ok()
        .header(HttpHeaders.SET_COOKIE, cookie(null, 0).toString())
        .body(Map.of("ok", true));
  }

  @GetMapping("/me")
  Map<String, Object> me(HttpServletRequest request) {
    long userId = requireClaims(request).userId();
    List<Map<String, Object>> rows = db.queryForList("SELECT * FROM users WHERE id = ?", userId);
    if (rows.isEmpty()) throw ApiException.unauthenticated("Not signed in.");
    return Map.of("user", publicUser(rows.get(0)));
  }

  /**
   * Always answers the same way, whether or not the address is registered —
   * otherwise the response tells a stranger which addresses have accounts.
   *
   * With no mailer configured, the link is printed to the server log. That is
   * the honest version of "an email was sent" for a demonstration app.
   */
  @PostMapping("/forgot-password")
  Map<String, Object> forgotPassword(@RequestBody EmailRequest in, HttpServletRequest request) {
    rateLimiter.check(request.getRemoteAddr());

    List<Map<String, Object>> rows =
        db.queryForList("SELECT id FROM users WHERE email = ? AND is_active", in.email());

    if (!rows.isEmpty()) {
      String token = randomToken();
      db.update(
          "INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)",
          ((Number) rows.get(0).get("id")).longValue(),
          sha256(token),
          Timestamp.from(Instant.now().plus(30, ChronoUnit.MINUTES)));
      System.out.println("[auth] password reset for " + in.email() + ": /reset-password?token=" + token);
    }

    return Map.of("message", "If that address has an account, a reset link is on its way.");
  }

  @PostMapping("/reset-password")
  Map<String, Object> resetPassword(@RequestBody ResetRequest in, HttpServletRequest request) {
    rateLimiter.check(request.getRemoteAddr());

    if (in.token() == null || in.password() == null) {
      throw ApiException.badRequest("INVALID_BODY", "A token and a password are required.");
    }
    if (in.password().length() < 8) {
      throw ApiException.badRequest("WEAK_PASSWORD", "Use at least 8 characters.");
    }

    List<Map<String, Object>> rows = db.queryForList(
        "SELECT id, user_id FROM password_reset_tokens "
            + "WHERE token_hash = ? AND used_at IS NULL AND expires_at > NOW()",
        sha256(in.token()));

    if (rows.isEmpty()) {
      throw ApiException.badRequest("INVALID_RESET_TOKEN", "That reset link is invalid or has expired.");
    }

    long userId = ((Number) rows.get(0).get("user_id")).longValue();
    db.update("UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?",
        passwords.encode(in.password()), userId);
    db.update("UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ?", rows.get(0).get("id"));
    // Whoever set the password gets the account; every existing session goes.
    db.update("UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL", userId);

    return Map.of("message", "Password updated. Please sign in.");
  }

  // --- helpers -------------------------------------------------------------

  /** Issues both tokens and sets the cookie. Used by login and refresh alike. */
  private ResponseEntity<Map<String, Object>> session(Map<String, Object> user, boolean rememberMe) {
    long userId = ((Number) user.get("id")).longValue();
    String role = (String) user.get("role");

    long expiresAt = Instant.now().plus(accessMinutes, ChronoUnit.MINUTES).getEpochSecond();
    String accessToken = jwt.sign(userId, role, expiresAt);

    String refreshToken = randomToken();
    int days = rememberMe ? rememberDays : refreshDays;
    db.update(
        "INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)",
        userId, sha256(refreshToken), Timestamp.from(Instant.now().plus(days, ChronoUnit.DAYS)));

    Map<String, Object> body = new LinkedHashMap<>();
    body.put("token", accessToken);
    body.put("expiresIn", accessMinutes * 60);
    body.put("user", publicUser(user));

    return ResponseEntity.ok()
        .header(HttpHeaders.SET_COOKIE, cookie(refreshToken, days * 24 * 60 * 60).toString())
        .body(body);
  }

  /** The user fields a client may see. The password hash is not among them. */
  private Map<String, Object> publicUser(Map<String, Object> user) {
    Map<String, Object> out = new LinkedHashMap<>();
    out.put("id", user.get("id"));
    // `text()` rather than the raw value: `email` is CITEXT, which the driver
    // hands back as a PGobject. Serialized directly it becomes
    // {"type":"citext","value":"...","null":false} instead of a string.
    out.put("email", text(user.get("email")));
    out.put("displayName", user.get("display_name"));
    out.put("role", user.get("role"));
    return out;
  }

  private ResponseCookie cookie(String value, long maxAgeSeconds) {
    return ResponseCookie.from(COOKIE, value == null ? "" : value)
        // httpOnly is what keeps the refresh token out of reach of any script
        // on the page, which is the entire reason it lives in a cookie.
        .httpOnly(true)
        .secure(cookieSecure)
        .sameSite("Lax")
        .path("/")
        .maxAge(maxAgeSeconds)
        .build();
  }

  /**
   * Capabilities per role, rather than checks against role names.
   *
   * Route policy reads "this needs products:create", so adding a role is a line
   * in this table instead of an edit at every call site — and reading the table
   * tells you what a role can do, which reading scattered `equals("admin")`
   * never does.
   */
  private static final Map<String, Set<String>> ROLE_PERMISSIONS = Map.of(
      "admin", Set.of("products:create", "products:update", "products:delete"),
      "user", Set.of());

  /**
   * The caller, if the token verifies and the role carries the permission.
   *
   * 401 and 403 are different answers: the first means "who are you", the
   * second means "I know who you are, and no".
   */
  Jwt.Claims requirePermission(HttpServletRequest request, String permission) {
    Jwt.Claims claims = requireClaims(request);
    Set<String> permissions = ROLE_PERMISSIONS.getOrDefault(claims.role(), Set.of());
    if (!permissions.contains(permission)) {
      throw ApiException.forbidden("You do not have permission to do that.");
    }
    return claims;
  }

  /** The caller's claims from the Bearer token, or 401. */
  Jwt.Claims requireClaims(HttpServletRequest request) {
    String header = request.getHeader("Authorization");
    // Case-insensitive scheme: the RFC says it is not case-sensitive, and some
    // clients send "bearer".
    if (header == null || header.length() < 7 || !header.substring(0, 7).equalsIgnoreCase("bearer ")) {
      throw ApiException.unauthenticated("Sign in to continue.");
    }
    Jwt.Claims claims = jwt.verify(header.substring(7).trim());
    if (claims == null) throw ApiException.unauthenticated("Session expired. Please sign in again.");
    return claims;
  }

  /** A database value as plain text, unwrapping driver-specific types. */
  static String text(Object value) {
    return value == null ? null : String.valueOf(value);
  }

  private static String randomToken() {
    byte[] bytes = new byte[32];
    RANDOM.nextBytes(bytes);
    return HexFormat.of().formatHex(bytes);
  }

  /**
   * Refresh and reset tokens are stored hashed, so a database leak does not
   * hand over live sessions. SHA-256 without a salt is right here and wrong for
   * passwords: these values are long and random, so there is nothing to guess.
   */
  private static String sha256(String value) {
    try {
      byte[] digest = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
      return HexFormat.of().formatHex(digest);
    } catch (Exception e) {
      throw new IllegalStateException(e);
    }
  }
}
