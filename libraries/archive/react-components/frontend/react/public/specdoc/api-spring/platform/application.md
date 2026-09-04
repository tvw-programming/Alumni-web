## Component Specification

### Name & Purpose

`Application` — the Spring Boot entry point. Wires the four beans this app has,
serves uploaded files, and opens CORS.

### Location

`src/main/java/com/idol/api/Application.java`,
`src/main/resources/application.properties`

### Public Interface

```java
@SpringBootApplication
public class Application implements WebMvcConfigurer {
  public static void main(String[] args);

  @Bean BCryptPasswordEncoder passwordEncoder();      // cost 12
  @Override public void addResourceHandlers(ResourceHandlerRegistry registry);
  @Override public void addCorsMappings(CorsRegistry registry);
}
```

Configuration, all overridable by environment variable:

| Property                   | Env                             | Default                  |
| -------------------------- | ------------------------------- | ------------------------ |
| `server.port`              | `PORT`                          | 8080 (published as 8082) |
| `spring.datasource.url`    | `DB_HOST`, `DB_PORT`, `DB_NAME` | localhost:5432/items_app |
| `app.upload-dir`           | `UPLOAD_DIR`                    | `./uploads`              |
| `app.jwt-secret`           | `JWT_SECRET`                    | a development key        |
| `app.access-token-minutes` | `ACCESS_TOKEN_MINUTES`          | 15                       |
| `app.refresh-token-days`   | `REFRESH_TOKEN_DAYS`            | 7                        |
| `app.remember-me-days`     | `REMEMBER_ME_DAYS`              | 30                       |
| `app.cookie-secure`        | `COOKIE_SECURE`                 | false                    |

### Dependencies

- `spring-boot-starter-web`, `spring-boot-starter-jdbc`,
  `spring-security-crypto`, `postgresql` (runtime). That is all four.
- No JWT library, no JPA, no Swagger UI, no test framework.

### Data Models

None. `JdbcTemplate` is auto-configured from the datasource properties.

### Business Rules & Constraints

**bcrypt cost 12**, matching the Go API. The two share a `users` table, so a
hash written by one has to verify in the other. A different cost would still
verify existing hashes but would write ones the other app rehashes.

**Uploads are served without a session:**

```java
registry.addResourceHandler("/uploads/**")
    .addResourceLocations("file:" + uploadDir + "/")
    .setCachePeriod(3600);
```

Deliberately public, as in the Go API: an `<img>` tag cannot send an
`Authorization` header. Random filenames are the only thing between an upload
and anyone who guesses its URL.

**CORS is wide open**, and only defensible because this is a local
demonstration. `allowCredentials(true)` is what lets the refresh cookie travel,
and is exactly why a real deployment would name its origins.

**No schema ownership.** This app runs no migrations. `db/init/*.sql` and the Go
API's embedded migrations remain the single source of truth, which is what lets
both APIs run against one database.

### Extension Points

- **A new endpoint** — a new `@RestController` in the same package; nothing else
  needs to know.
- **Sharing sessions with the Go API** — set `AUTH_JWT_SECRET` in `.env`; both
  read it, and tokens become interchangeable.
