package com.idol.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Writes one row per successful mutation.
 *
 * Only after the change committed, and never in a way that can fail the
 * request: an audit trail that rolls back the thing it was recording is worse
 * than none, because the change happened and the record says it did not.
 *
 * The Go API records the same five things — who, what, which row, which
 * request, from where — into the same `audit_events` table.
 */
@Component
class Audit {

  private static final ObjectMapper JSON = new ObjectMapper();

  private final JdbcTemplate db;

  Audit(JdbcTemplate db) {
    this.db = db;
  }

  void record(HttpServletRequest request, Long actorUserId, String action, String resourceId,
      Map<String, Object> metadata) {
    try {
      // The metadata is bound as text and cast in SQL. Binding a PGobject would
      // work too, and would mean importing a driver class into application
      // code for no gain — the driver stays a runtime dependency this way.
      String metadataJson = JSON.writeValueAsString(metadata == null ? Map.of() : metadata);

      db.update(
          """
          INSERT INTO audit_events (actor_user_id, action, resource_type, resource_id, request_id, ip_address, metadata)
          VALUES (?, ?, 'product', ?, ?, ?::inet, ?::jsonb)
          """,
          actorUserId, action, resourceId, RequestId.of(request), request.getRemoteAddr(), metadataJson);
    } catch (Exception e) {
      // Swallowed deliberately. See the class comment: the mutation already
      // happened, so failing here would report a false negative to the caller.
      System.out.println("[audit] failed to record " + action + ": " + e);
    }
  }
}
