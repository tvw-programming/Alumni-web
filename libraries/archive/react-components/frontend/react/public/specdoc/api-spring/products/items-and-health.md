## Component Specification

### Name & Purpose

`ItemController` — the demonstration items list, the three health probes, and
the OpenAPI document.

### Location

`src/main/java/com/idol/api/ItemController.java`,
`src/main/resources/openapi.yaml`

### Public Interface

```java
@RestController
class ItemController {
  @GetMapping("/api/items")            List<Map<String, Object>> items();
  @GetMapping("/livez")                Map<String, Object> live();
  @GetMapping({"/health", "/readyz"})  Map<String, Object> health();
  @GetMapping("/startupz")             ResponseEntity<Map<String, Object>> startup();
  @GetMapping("/api/docs")             ResponseEntity<String> docs();
}
```

### Dependencies

- Spring: `JdbcTemplate`, `ClassPathResource`.
- Table: `items` (id, name).

### Data Models

```json
[{"id": 1, "name": "Production dashboard1"}]
{"status": "ok", "database": "ok"}
```

### Business Rules & Constraints

**Three probes, three different questions:**

| Probe                | Question                | Touches the database |
| -------------------- | ----------------------- | -------------------- |
| `/livez`             | is the process up       | no                   |
| `/readyz`, `/health` | can it serve traffic    | yes                  |
| `/startupz`          | has it finished booting | no                   |

**Liveness must not query the database.** A liveness check that did would restart
the application every time the database hiccuped, which fixes nothing and
removes capacity exactly when it is needed.

**`/startupz` returns 503 until the context is built**, so an orchestrator waits
instead of restarting a slow start. The flag is set in the constructor, which is
the last thing to run for this bean.

**`/api/items` is public**, as in the Go API — it is demonstration data.

**`/api/docs` serves the contract, not a rendered UI.** The Go API mounts Swagger
UI at the same path; rendering it here would mean a dependency to display
something every client tool already reads.

### Extension Points

- **A real items feature** — there is no create, update or delete; the table has
  two columns.
- **Keeping the contract honest** — `openapi.yaml` is hand-written and nothing
  checks it against the routes. It will drift unless edited alongside them.
