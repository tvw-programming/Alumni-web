package com.idol.api;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** The items list, and the health checks. Both are one query or none. */
@RestController
class ItemController {

  /**
   * Flipped once the context is up. A startup probe exists to say "still
   * booting, do not restart me yet", which is a different question from
   * liveness and needs its own answer.
   */
  private static final AtomicBoolean STARTED = new AtomicBoolean(false);

  private final JdbcTemplate db;

  ItemController(JdbcTemplate db) {
    this.db = db;
    STARTED.set(true);
  }

  /** Public, exactly as in the Go API — it is demonstration data. */
  @GetMapping("/api/items")
  List<Map<String, Object>> items() {
    return db.queryForList("SELECT id, name FROM items ORDER BY id");
  }

  /** Liveness: the process is up. Deliberately does not touch the database. */
  @GetMapping("/livez")
  Map<String, Object> live() {
    return Map.of("status", "ok");
  }

  /**
   * Readiness: the process can serve traffic, which here means the database
   * answers. A liveness check that queried the database would restart the app
   * every time the database hiccuped, which fixes nothing.
   */
  @GetMapping({"/health", "/readyz"})
  Map<String, Object> health() {
    db.queryForObject("SELECT 1", Integer.class);
    return Map.of("status", "ok", "database", "ok");
  }

  /** Startup probe: has the application finished booting? */
  @GetMapping("/startupz")
  ResponseEntity<Map<String, Object>> startup() {
    return STARTED.get()
        ? ResponseEntity.ok(Map.of("status", "ok"))
        : ResponseEntity.status(503).body(Map.of("status", "starting"));
  }

  /**
   * The API contract, as YAML.
   *
   * The Go API serves Swagger UI at this path; this serves the document itself,
   * because rendering it would mean a UI dependency to display something every
   * client tool can already read.
   */
  @GetMapping(value = "/api/docs", produces = "application/yaml")
  ResponseEntity<String> docs() throws IOException {
    try (InputStream stream = new ClassPathResource("openapi.yaml").getInputStream()) {
      return ResponseEntity.ok()
          .contentType(MediaType.parseMediaType("application/yaml"))
          .body(new String(stream.readAllBytes(), StandardCharsets.UTF_8));
    }
  }
}
