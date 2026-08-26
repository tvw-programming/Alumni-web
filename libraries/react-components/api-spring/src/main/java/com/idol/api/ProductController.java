package com.idol.api;

import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.sql.Array;
import java.sql.Date;
import java.sql.Timestamp;
import java.sql.ResultSet;
import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * Products: list, read, create, update, delete.
 *
 * The Go API has three pagination modes; this has two — a page at a time, or
 * everything. Keyset pagination is the one that stays fast on a large table,
 * and it is left out here because it is the more complicated of the two and
 * this app is optimising for being readable.
 *
 * Create accepts JSON *or* multipart, chosen by Content-Type, because the form
 * that feeds it may or may not have files attached.
 */
@RestController
@RequestMapping("/api/products")
class ProductController {

  /**
   * Sortable columns, listed rather than accepted.
   *
   * A sort column goes into SQL as an identifier, which no placeholder can
   * carry, so an allow-list is the thing standing between this and injection.
   */
  private static final Map<String, String> SORTABLE = Map.of(
      "productId", "product_id",
      "productName", "product_name",
      "price", "price",
      "rating", "rating",
      "releaseDate", "release_date",
      "category", "category",
      "createdAt", "created_at");

  /** A page size nobody asked for is a page size that fills a heap. */
  private static final int MAX_PAGE_SIZE = 200;

  private static final com.fasterxml.jackson.databind.ObjectMapper JSON =
      new com.fasterxml.jackson.databind.ObjectMapper();

  private final JdbcTemplate db;
  private final AuthController auth;
  private final Audit audit;
  private final Idempotency idempotency;
  private final Path uploadDir;

  ProductController(
      JdbcTemplate db,
      AuthController auth,
      Audit audit,
      Idempotency idempotency,
      @Value("${app.upload-dir}") String uploadDir) {
    this.db = db;
    this.auth = auth;
    this.audit = audit;
    this.idempotency = idempotency;
    this.uploadDir = Paths.get(uploadDir);
  }

  /**
   * Three pagination modes, chosen by `mode`, matching the Go API:
   *
   * - **offset** (default) — page numbers, because a pager with numbered pages
   *   needs them;
   * - **keyset** — a cursor, which stays fast at any depth because the database
   *   seeks instead of counting past rows;
   * - **all** — no limit, for exports. The filters still apply, so this is not
   *   "select the whole table".
   *
   * `withTotal=false` skips the COUNT. On a filtered table the count costs about
   * as much as the page itself, and a caller that only needs "is there more"
   * should not pay for it — which is why `total` is null rather than 0 when it
   * was not asked for. Those two mean different things.
   */
  @GetMapping
  Map<String, Object> list(
      @RequestParam(defaultValue = "offset") String mode,
      @RequestParam(defaultValue = "1") int page,
      @RequestParam(defaultValue = "25") int pageSize,
      @RequestParam(required = false) String cursor,
      @RequestParam(defaultValue = "true") boolean withTotal,
      @RequestParam(required = false) String search,
      @RequestParam(required = false) String sortBy,
      @RequestParam(defaultValue = "asc") String sortDir,
      @RequestParam Map<String, String> allParams) {

    String effectiveMode = cursor != null && !cursor.isBlank() ? "keyset" : mode.toLowerCase();
    int size = Math.min(Math.max(pageSize, 1), MAX_PAGE_SIZE);
    int effectivePage = Math.max(page, 1);

    StringBuilder where = new StringBuilder(" WHERE 1 = 1");
    List<Object> args = new ArrayList<>();
    applyFilters(where, args, search, allParams);

    // Unknown or absent sort falls back to the default ordering, which is also
    // the one the composite index is built for. The null check comes first
    // because Map.of() throws on a null key rather than missing.
    String sortColumn = "created_at";
    boolean sortDesc = true;
    if (sortBy != null && SORTABLE.containsKey(sortBy)) {
      sortColumn = SORTABLE.get(sortBy);
      sortDesc = "desc".equalsIgnoreCase(sortDir);
    }
    String direction = sortDesc ? "DESC" : "ASC";

    Long total = null;
    if (withTotal && !effectiveMode.equals("all")) {
      total = db.queryForObject("SELECT COUNT(*) FROM products" + where, Long.class, args.toArray());
    }

    List<Map<String, Object>> items;
    boolean hasMore = false;
    String nextCursor = null;

    switch (effectiveMode) {
      case "all" -> items = db.query(
          "SELECT * FROM products" + where + " ORDER BY " + sortColumn + " " + direction + ", id DESC",
          ROW, args.toArray());

      case "keyset" -> {
        // A cursor is only meaningful against the sort it was produced for.
        // Returning wrong rows for a different sort would be worse than refusing.
        if (!sortColumn.equals("created_at") || !sortDesc) {
          throw ApiException.badRequest("INVALID_CURSOR",
              "Cursor pagination is only supported on the default ordering.");
        }
        if (cursor != null && !cursor.isBlank()) {
          long[] decoded = decodeCursor(cursor);
          // A row-value comparison, so the (created_at DESC, id DESC) index is
          // used directly instead of a filter the database applies afterwards.
          where.append(" AND (created_at, id) < (?, ?)");
          args.add(cursorTimestamp(decoded[0]));
          args.add(decoded[1]);
        }
        List<Object> paged = new ArrayList<>(args);
        // One extra row answers "is there more" without a second query.
        paged.add(size + 1);
        List<Map<String, Object>> fetched = db.query(
            "SELECT * FROM products" + where + " ORDER BY created_at DESC, id DESC LIMIT ?",
            ROW, paged.toArray());

        hasMore = fetched.size() > size;
        items = hasMore ? fetched.subList(0, size) : fetched;
        if (hasMore && !items.isEmpty()) {
          Map<String, Object> last = items.get(items.size() - 1);
          nextCursor = encodeCursor(last.get("createdAt"), ((Number) last.get("id")).longValue());
        }
      }

      default -> {
        List<Object> paged = new ArrayList<>(args);
        paged.add(size);
        paged.add((long) (effectivePage - 1) * size);
        items = db.query(
            "SELECT * FROM products" + where + " ORDER BY " + sortColumn + " " + direction
                + ", id DESC LIMIT ? OFFSET ?",
            ROW, paged.toArray());
        hasMore = total != null ? (long) effectivePage * size < total : items.size() == size;
      }
    }

    Map<String, Object> body = new LinkedHashMap<>();
    body.put("items", items);
    body.put("total", total);
    body.put("page", effectiveMode.equals("offset") ? effectivePage : 1);
    body.put("pageSize", size);
    body.put("hasMore", hasMore);
    if (nextCursor != null) body.put("nextCursor", nextCursor);
    return body;
  }

  /** Carries an ETag, which is the version a caller sends back in `If-Match`. */
  @GetMapping("/{id}")
  ResponseEntity<Map<String, Object>> get(@PathVariable long id) {
    Map<String, Object> product = load(id);
    return ResponseEntity.ok().eTag("\"" + product.get("version") + "\"").body(product);
  }

  private Map<String, Object> load(long id) {
    List<Map<String, Object>> rows = db.query("SELECT * FROM products WHERE id = ?", ROW, id);
    if (rows.isEmpty()) throw ApiException.notFound("Product not found.");
    return rows.get(0);
  }

  /** JSON create. Honours `Idempotency-Key`, so a retried POST creates one row. */
  @PostMapping(consumes = "application/json")
  ResponseEntity<?> createJson(@RequestBody Map<String, Object> input, HttpServletRequest request) {
    Jwt.Claims claims = auth.requirePermission(request, "products:create");
    return created(request, claims, input, () -> insert(input));
  }

  /**
   * Multipart create — the same fields, plus the files.
   *
   * The stored value is the *path*, not the bytes: the database holds a
   * reference and the file lives on disk, which is what keeps a row small
   * enough to return in a list.
   */
  @PostMapping(consumes = "multipart/form-data")
  ResponseEntity<?> createMultipart(
      @RequestParam Map<String, String> fields,
      @RequestParam(required = false) MultipartFile productImage,
      @RequestParam(required = false) List<MultipartFile> productDocuments,
      HttpServletRequest request) {

    Jwt.Claims claims = auth.requirePermission(request, "products:create");

    Map<String, Object> input = new LinkedHashMap<>(fields);
    // Repeated keys arrive as one comma-joined string in a Map<String,String>,
    // which is exactly the ambiguity the Go API avoids by reading them as a
    // list. Splitting here is the simple version, and it means a tag containing
    // a comma is not representable.
    for (String key : List.of("tags", "shippingRegions")) {
      Object value = input.get(key);
      if (value instanceof String s && !s.isBlank()) input.put(key, List.of(s.split(",")));
    }

    if (productImage != null && !productImage.isEmpty()) {
      input.put("productImagePath", store(productImage));
    }
    if (productDocuments != null && !productDocuments.isEmpty()) {
      List<String> paths = new ArrayList<>();
      for (MultipartFile file : productDocuments) {
        if (!file.isEmpty()) paths.add(store(file));
      }
      input.put("productDocumentPaths", paths);
    }

    Map<String, Object> body = input;
    return created(request, claims, fields, () -> insert(body));
  }

  /**
   * Partial update: only the keys present in the body are written.
   *
   * "Absent" and "null" mean different things — absent leaves the column alone,
   * null clears it — which is why this reads the map's keys rather than a DTO
   * whose unset fields would be indistinguishable from nulls.
   */
  @PatchMapping("/{id}")
  ResponseEntity<Map<String, Object>> patch(
      @PathVariable long id,
      @RequestBody Map<String, Object> input,
      @RequestHeader(name = "If-Match", required = false) String ifMatch,
      HttpServletRequest request) {

    Jwt.Claims claims = auth.requirePermission(request, "products:update");
    Long expectedVersion = parseIfMatch(ifMatch);

    List<String> assignments = new ArrayList<>();
    List<Object> args = new ArrayList<>();

    for (Map.Entry<String, String> entry : COLUMNS.entrySet()) {
      if (!input.containsKey(entry.getKey())) continue;
      assignments.add(entry.getValue()
          + (ARRAY_COLUMNS.contains(entry.getValue()) ? " = ?::text[]" : " = ?"));
      args.add(value(entry.getValue(), input.get(entry.getKey())));
    }

    if (assignments.isEmpty()) {
      throw ApiException.badRequest("INVALID_BODY", "No known fields to update.");
    }

    // The version is bumped in the same statement that writes the change, so a
    // reader can never see new data carrying the old version.
    args.add(id);
    String sql = "UPDATE products SET " + String.join(", ", assignments)
        + ", version = version + 1, updated_at = NOW() WHERE id = ?";
    if (expectedVersion != null) {
      sql += " AND version = ?";
      args.add(expectedVersion);
    }

    int updated = db.update(sql, args.toArray());
    if (updated == 0) conflictOrNotFound(id, expectedVersion);

    Map<String, Object> product = load(id);
    audit.record(request, claims.userId(), "product.update", String.valueOf(id),
        Map.of("fields", new ArrayList<>(input.keySet())));
    return ResponseEntity.ok().eTag("\"" + product.get("version") + "\"").body(product);
  }

  @DeleteMapping("/{id}")
  ResponseEntity<Void> delete(
      @PathVariable long id,
      @RequestHeader(name = "If-Match", required = false) String ifMatch,
      HttpServletRequest request) {

    Jwt.Claims claims = auth.requirePermission(request, "products:delete");
    Long expectedVersion = parseIfMatch(ifMatch);

    int deleted = expectedVersion == null
        ? db.update("DELETE FROM products WHERE id = ?", id)
        : db.update("DELETE FROM products WHERE id = ? AND version = ?", id, expectedVersion);

    if (deleted == 0) conflictOrNotFound(id, expectedVersion);

    audit.record(request, claims.userId(), "product.delete", String.valueOf(id), Map.of());
    // 204: the resource is gone, and there is nothing useful to say about it.
    return ResponseEntity.noContent().build();
  }

  /**
   * Tells "gone" apart from "changed under you".
   *
   * Both make the statement affect no rows, and they need different answers: a
   * 404 says stop, a 409 says re-read and try again.
   */
  private void conflictOrNotFound(long id, Long expectedVersion) {
    boolean exists = Boolean.TRUE.equals(
        db.queryForObject("SELECT EXISTS (SELECT 1 FROM products WHERE id = ?)", Boolean.class, id));
    if (exists && expectedVersion != null) {
      // 412, not 409: the caller stated a precondition (If-Match) and it did
      // not hold. 409 is for a conflict with no precondition given.
      throw new ApiException(org.springframework.http.HttpStatus.PRECONDITION_FAILED,
          "VERSION_CONFLICT", "This product changed since you loaded it. Reload and try again.");
    }
    throw ApiException.notFound("Product not found.");
  }

  /** `If-Match: "3"` or `W/"3"` to the number 3. Absent means "no precondition". */
  private Long parseIfMatch(String header) {
    if (header == null || header.isBlank()) return null;
    String raw = header.trim();
    if (raw.startsWith("W/")) raw = raw.substring(2);
    raw = raw.replace("\"", "");
    try {
      long version = Long.parseLong(raw);
      if (version <= 0) throw new NumberFormatException();
      return version;
    } catch (NumberFormatException e) {
      throw ApiException.badRequest("INVALID_IF_MATCH", "If-Match must contain a positive product version.");
    }
  }


  /**
   * The create path both content types share.
   *
   * With no `Idempotency-Key` this is just "run it". With one, the key is
   * claimed first and the response stored after, so a retry replays rather
   * than repeats.
   */
  private ResponseEntity<?> created(
      HttpServletRequest request,
      Jwt.Claims claims,
      Object bodyForHash,
      java.util.function.Supplier<Map<String, Object>> handler) {

    Idempotency.Key key = idempotency.read(request, claims, bodyForHash);

    if (key != null) {
      Map<String, Object> replay = idempotency.claimOrReplay(key);
      if (replay != null) {
        return ResponseEntity.status(org.springframework.http.HttpStatus.CREATED)
            .header("Idempotent-Replay", "true")
            .header(org.springframework.http.HttpHeaders.CONTENT_TYPE, "application/json")
            .body(replay.get("body"));
      }
    }

    Map<String, Object> product;
    try {
      product = handler.get();
    } catch (RuntimeException e) {
      // The claim has to go, or a corrected retry with the same key would be
      // answered "still processing" for the next 24 hours.
      if (key != null) idempotency.release(key);
      throw e;
    }

    audit.record(request, claims.userId(), "product.create",
        String.valueOf(product.get("id")), Map.of("productId", String.valueOf(product.get("productId"))));

    if (key != null) {
      try {
        idempotency.complete(key, JSON.writeValueAsString(product));
      } catch (Exception e) {
        System.out.println("[idempotency] could not store response: " + e);
      }
    }

    return ResponseEntity.status(org.springframework.http.HttpStatus.CREATED)
        .eTag("\"" + product.get("version") + "\"")
        .body(product);
  }

  /** WHERE clause shared by the count and the page, so the two cannot drift. */
  private void applyFilters(
      StringBuilder where, List<Object> args, String search, Map<String, String> params) {

    if (search != null && !search.isBlank()) {
      where.append(" AND (product_name ILIKE ? OR product_id ILIKE ?)");
      args.add("%" + search + "%");
      args.add("%" + search + "%");
    }

    for (String name : List.of("category", "condition", "availability")) {
      String value = params.get(name);
      if (value != null && !value.isBlank()) {
        where.append(" AND ").append(name).append(" = ?");
        args.add(value);
      }
    }
    if (params.get("isPublished") != null && !params.get("isPublished").isBlank()) {
      where.append(" AND is_published = ?");
      args.add("true".equalsIgnoreCase(params.get("isPublished")));
    }
    // Array containment, which the GIN indexes serve.
    if (params.get("tag") != null && !params.get("tag").isBlank()) {
      where.append(" AND tags @> ARRAY[?]::text[]");
      args.add(params.get("tag"));
    }
    if (params.get("region") != null && !params.get("region").isBlank()) {
      where.append(" AND shipping_regions @> ARRAY[?]::text[]");
      args.add(params.get("region"));
    }
  }

  /**
   * Cursors are opaque on purpose: encoding them means the format can change
   * without breaking a saved link, and it stops anyone treating the value as a
   * row id.
   */
  private static String encodeCursor(Object createdAt, long id) {
    Timestamp timestamp = (Timestamp) createdAt;
    // Full nanosecond precision, not `getTime() * 1_000_000`. Seeded rows share
    // a created_at to the microsecond; a cursor truncated to milliseconds sorts
    // *before* the row it came from, and the next page comes back empty.
    long nanos = (timestamp.getTime() / 1000L) * 1_000_000_000L + timestamp.getNanos();
    return Base64.getUrlEncoder().withoutPadding()
        .encodeToString((nanos + "|" + id).getBytes(java.nio.charset.StandardCharsets.UTF_8));
  }

  /** The inverse, preserving the sub-millisecond part. */
  private static Timestamp cursorTimestamp(long nanos) {
    Timestamp timestamp = new Timestamp((nanos / 1_000_000_000L) * 1000L);
    timestamp.setNanos((int) (nanos % 1_000_000_000L));
    return timestamp;
  }

  private static long[] decodeCursor(String cursor) {
    try {
      String raw = new String(Base64.getUrlDecoder().decode(cursor), java.nio.charset.StandardCharsets.UTF_8);
      String[] parts = raw.split("\\|", 2);
      return new long[] {Long.parseLong(parts[0]), Long.parseLong(parts[1])};
    } catch (RuntimeException e) {
      throw ApiException.badRequest("INVALID_CURSOR", "That page cursor is not valid.");
    }
  }

  // --- the parts that would be a mapper in a bigger app --------------------

  /** JSON name to column name. The only place the two vocabularies meet. */
  private static final Map<String, String> COLUMNS = new LinkedHashMap<>();

  static {
    COLUMNS.put("productId", "product_id");
    COLUMNS.put("productName", "product_name");
    COLUMNS.put("description", "description");
    COLUMNS.put("price", "price");
    COLUMNS.put("rating", "rating");
    COLUMNS.put("productImagePath", "product_image_path");
    COLUMNS.put("productDocumentPaths", "product_document_paths");
    COLUMNS.put("comments", "comments");
    COLUMNS.put("releaseDate", "release_date");
    COLUMNS.put("supportEmail", "support_email");
    COLUMNS.put("supportPhone", "support_phone");
    COLUMNS.put("productUrl", "product_url");
    COLUMNS.put("themeColor", "theme_color");
    COLUMNS.put("condition", "condition");
    COLUMNS.put("availability", "availability");
    COLUMNS.put("tags", "tags");
    COLUMNS.put("shippingRegions", "shipping_regions");
    COLUMNS.put("warrantyMonths", "warranty_months");
    COLUMNS.put("isPublished", "is_published");
    COLUMNS.put("acceptTerms", "accept_terms");
    COLUMNS.put("category", "category");
  }

  private static final Set<String> ARRAY_COLUMNS =
      Set.of("product_document_paths", "tags", "shipping_regions");

  private Map<String, Object> insert(Map<String, Object> input) {
    List<String> columns = new ArrayList<>();
    List<String> placeholders = new ArrayList<>();
    List<Object> args = new ArrayList<>();

    for (Map.Entry<String, String> entry : COLUMNS.entrySet()) {
      if (!input.containsKey(entry.getKey())) continue;
      columns.add(entry.getValue());
      placeholders.add(ARRAY_COLUMNS.contains(entry.getValue()) ? "?::text[]" : "?");
      args.add(value(entry.getValue(), input.get(entry.getKey())));
    }

    // The column is NOT NULL DEFAULT '{}', and a DEFAULT does not apply when
    // the client sends an explicit NULL — which is what an absent list would
    // become. Sending an empty array is the difference between a create that
    // works and one that fails on the constraint.
    for (String column : ARRAY_COLUMNS) {
      if (!columns.contains(column) && !column.equals("shipping_regions")) {
        columns.add(column);
        placeholders.add("?::text[]");
        args.add(array(List.of()));
      }
    }

    if (columns.isEmpty()) throw ApiException.badRequest("INVALID_BODY", "No product fields supplied.");

    try {
      Long id = db.queryForObject(
          "INSERT INTO products (" + String.join(", ", columns) + ") VALUES ("
              + String.join(", ", placeholders) + ") RETURNING id",
          Long.class,
          args.toArray());
      return load(id);
    } catch (org.springframework.dao.DataIntegrityViolationException e) {
      // Every CHECK and UNIQUE on the table lands here. The database is the
      // only place the rules are actually enforced, so this app does no
      // validation of its own and reports what the database said.
      String detail = rootMessage(e);
      if (detail.contains("products_product_id_unique")) {
        throw ApiException.conflict("DUPLICATE_PRODUCT_ID", "That product id is already taken.");
      }
      throw ApiException.badRequest("VALIDATION_ERROR", "That product was rejected: " + detail);
    }
  }

  /** Converts one JSON value to what JDBC wants for that column. */
  private Object value(String column, Object raw) {
    if (raw == null) return null;
    if (ARRAY_COLUMNS.contains(column)) {
      List<?> list = raw instanceof List<?> l ? l : List.of(raw);
      return array(list);
    }
    return switch (column) {
      case "price" -> new BigDecimal(String.valueOf(raw));
      case "release_date" -> Date.valueOf(String.valueOf(raw).substring(0, 10));
      case "rating", "warranty_months" -> Integer.valueOf(String.valueOf(raw));
      case "is_published", "accept_terms" -> Boolean.valueOf(String.valueOf(raw));
      default -> raw;
    };
  }

  /**
   * A PostgreSQL array literal, bound as text and cast in SQL (`?::text[]`).
   *
   * The obvious alternative, `dataSource.getConnection().createArrayOf(...)`,
   * needs a live connection to build the value — and taking one from the pool
   * here means it is never returned, because the array outlives the scope that
   * would close it. That leak emptied a 10-connection pool after a handful of
   * writes and turned every later request into a 30-second timeout, so this
   * builds the literal instead and touches no connection at all.
   */
  private static String array(List<?> values) {
    StringBuilder out = new StringBuilder("{");
    for (int i = 0; i < values.size(); i += 1) {
      if (i > 0) out.append(',');
      // Backslash first: escaping the quotes first would then double-escape
      // the backslashes this adds.
      String item = String.valueOf(values.get(i)).replace("\\", "\\\\").replace("\"", "\\\"");
      out.append('"').append(item).append('"');
    }
    return out.append('}').toString();
  }

  /** Row to JSON, camelCase, matching the Go API's field names. */
  private static final RowMapper<Map<String, Object>> ROW = (ResultSet rs, int rowNum) -> {
    Map<String, Object> out = new LinkedHashMap<>();
    out.put("id", rs.getLong("id"));
    for (Map.Entry<String, String> entry : COLUMNS.entrySet()) {
      String column = entry.getValue();
      Object value;
      if (ARRAY_COLUMNS.contains(column)) {
        Array array = rs.getArray(column);
        value = array == null ? List.of() : List.of((Object[]) array.getArray());
      } else if (column.equals("support_email")) {
        // CITEXT again — see AuthController.text.
        value = AuthController.text(rs.getObject(column));
      } else if (column.equals("price")) {
        // A string, not a double: 19.99 has no exact binary representation, and
        // money that drifts by a cent is money that is wrong.
        BigDecimal price = rs.getBigDecimal(column);
        value = price == null ? null : price.toPlainString();
      } else {
        value = rs.getObject(column);
      }
      out.put(entry.getKey(), value);
    }
    out.put("version", rs.getLong("version"));
    out.put("createdAt", rs.getObject("created_at"));
    out.put("updatedAt", rs.getObject("updated_at"));
    return out;
  };

  /** Writes an upload under a random name and returns its relative path. */
  private String store(MultipartFile file) {
    String original = file.getOriginalFilename() == null ? "" : file.getOriginalFilename();
    int dot = original.lastIndexOf('.');
    String extension = dot == -1 ? "" : original.substring(dot).toLowerCase();

    // A client-supplied filename can contain "../" or a shell character; a
    // random name means none of it is ever used as a path.
    String name = UUID.randomUUID() + extension;
    try {
      Files.createDirectories(uploadDir);
      file.transferTo(uploadDir.resolve(name).toAbsolutePath());
    } catch (IOException e) {
      throw new IllegalStateException("could not store " + name, e);
    }
    return "/uploads/" + name;
  }

  private static String rootMessage(Throwable e) {
    Throwable cause = e;
    while (cause.getCause() != null) cause = cause.getCause();
    return cause.getMessage() == null ? "unknown constraint" : cause.getMessage().split("\n")[0];
  }
}
