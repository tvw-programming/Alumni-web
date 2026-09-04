package com.idol.api;

import jakarta.servlet.http.HttpServletRequest;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Makes a retried POST safe to replay.
 *
 * A client that sends `Idempotency-Key` gets the *first* response back for
 * every later attempt with that key, so a network timeout followed by a retry
 * creates one product rather than two.
 *
 * Three states matter and are answered differently:
 *
 * - **first use** — a `processing` row is claimed and the handler runs;
 * - **same key, same body** — the stored response is replayed;
 * - **same key, different body** — 409. That is a client bug, and quietly
 *   returning the old response would hide it.
 *
 * The Go API stores the raw response bytes; this stores what it needs to
 * rebuild the JSON body, which is the simpler half of the same idea.
 */
@Component
class Idempotency {

  static final String HEADER = "Idempotency-Key";
  private static final int RETENTION_HOURS = 24;

  private final JdbcTemplate db;

  Idempotency(JdbcTemplate db) {
    this.db = db;
  }

  /** What a caller supplied, or null when the header is absent. */
  record Key(String scope, String value, String requestHash) {}

  Key read(HttpServletRequest request, Jwt.Claims claims, Object body) {
    String value = request.getHeader(HEADER);
    if (value == null || value.isBlank()) return null;
    if (value.length() > 128) {
      throw ApiException.badRequest("INVALID_IDEMPOTENCY_KEY", "Idempotency-Key is too long.");
    }

    // Scoped per caller and route: two users sending the same key are not
    // making the same request, and neither are two different endpoints.
    String scope = "user:" + claims.userId() + ":" + request.getMethod() + ":" + request.getRequestURI();
    return new Key(scope, value, sha256(String.valueOf(body)));
  }

  /**
   * Claims the key, or returns the stored response to replay.
   *
   * The INSERT is the lock: the unique index on (scope, key) means two
   * simultaneous retries cannot both claim it, and the loser reads the row.
   */
  Map<String, Object> claimOrReplay(Key key) {
    try {
      db.update(
          """
          INSERT INTO idempotency_records (scope, idempotency_key, request_hash, state, expires_at)
          VALUES (?, ?, ?, 'processing', ?)
          """,
          key.scope(), key.value(), key.requestHash(),
          Timestamp.from(Instant.now().plus(RETENTION_HOURS, ChronoUnit.HOURS)));
      return null;
    } catch (org.springframework.dao.DuplicateKeyException e) {
      List<Map<String, Object>> rows = db.queryForList(
          "SELECT request_hash, state, response_body FROM idempotency_records "
              + "WHERE scope = ? AND idempotency_key = ?",
          key.scope(), key.value());

      if (rows.isEmpty()) return null;
      Map<String, Object> record = rows.get(0);

      if (!key.requestHash().equals(String.valueOf(record.get("request_hash")).trim())) {
        throw ApiException.conflict("IDEMPOTENCY_KEY_REUSED",
            "That Idempotency-Key was already used with a different request body.");
      }
      if (!"complete".equals(record.get("state"))) {
        // The first attempt is still running. Retrying in a moment is the right
        // answer; inventing a second product is not.
        throw new ApiException(HttpStatus.CONFLICT, "REQUEST_IN_PROGRESS",
            "That request is still being processed. Try again shortly.");
      }
      return Map.of("body", new String((byte[]) record.get("response_body"), StandardCharsets.UTF_8));
    }
  }

  /** Stores the response so the next retry with this key replays it. */
  void complete(Key key, String responseBody) {
    db.update(
        "UPDATE idempotency_records SET state = 'complete', response_status = 201, "
            + "response_content_type = 'application/json', response_body = ?, updated_at = NOW() "
            + "WHERE scope = ? AND idempotency_key = ?",
        responseBody.getBytes(StandardCharsets.UTF_8), key.scope(), key.value());
  }

  /** A claim that never completed must not block the key forever. */
  void release(Key key) {
    db.update("DELETE FROM idempotency_records WHERE scope = ? AND idempotency_key = ? AND state = 'processing'",
        key.scope(), key.value());
  }

  private static String sha256(String value) {
    try {
      byte[] digest = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
      return HexFormat.of().formatHex(digest);
    } catch (Exception e) {
      throw new IllegalStateException(e);
    }
  }
}
