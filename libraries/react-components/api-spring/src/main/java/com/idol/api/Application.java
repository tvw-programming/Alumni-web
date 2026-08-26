package com.idol.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * The whole application.
 *
 * This is the simplest possible port of the Go Fiber API: one package, no
 * service layer, no interfaces, no repositories. Controllers talk to
 * JdbcTemplate directly and SQL is written out in full where it is used.
 *
 * That is a deliberate choice and the wrong one for a system that has to grow:
 * there is no seam to test against, the same query appears more than once, and
 * nothing here is reusable. It is written this way because the goal is to read
 * the whole thing in one sitting and see exactly what each endpoint does.
 *
 * What it does NOT reproduce from the Go API: rate limiting, account lockout,
 * request IDs, audit logging, structured logs, idempotency keys, keyset
 * pagination, optimistic concurrency, the background worker and OpenAPI. Those
 * are the parts that exist for scale and safety, which is what this app trades
 * away for size. See README.md for the full list.
 */
@SpringBootApplication
public class Application implements WebMvcConfigurer {

  public static void main(String[] args) {
    SpringApplication.run(Application.class, args);
  }

  /**
   * Cost 12, matching the Go API, because the two share a users table — a hash
   * written by one has to verify in the other.
   */
  @Bean
  BCryptPasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder(12);
  }

  /**
   * Wide open, and only defensible because this app is a local demonstration.
   * `allowCredentials` is what lets the refresh cookie travel, and it is exactly
   * why a real deployment would name its origins instead.
   */
  @Value("${app.upload-dir}")
  private String uploadDir;

  /**
   * Uploaded files, served without a session.
   *
   * Deliberately public, as in the Go API: an `<img>` tag cannot send an
   * Authorization header, so gating these would break every product image.
   * The filenames are random, which is the only thing standing between an
   * upload and anyone who guesses its URL.
   */
  @Override
  public void addResourceHandlers(ResourceHandlerRegistry registry) {
    registry.addResourceHandler("/uploads/**")
        .addResourceLocations("file:" + uploadDir + "/")
        .setCachePeriod(3600);
  }

  @Override
  public void addCorsMappings(CorsRegistry registry) {
    registry.addMapping("/**")
        .allowedOriginPatterns("*")
        .allowedMethods("*")
        .allowCredentials(true);
  }
}
