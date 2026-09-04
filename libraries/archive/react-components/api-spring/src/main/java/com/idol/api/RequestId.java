package com.idol.api;

import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.UUID;
import org.springframework.stereotype.Component;

/**
 * Gives every request an id and echoes it back.
 *
 * A client-supplied `X-Request-Id` is honoured so a trace can span the browser,
 * the frontend and this API; anything else gets a fresh UUID. The id ends up in
 * the response header and in every error body, which is what makes a screenshot
 * of a failure enough to find the request in the log.
 *
 * The value is stored on the request rather than in a ThreadLocal: it is
 * already scoped to the request, and nothing here hands work to another thread.
 */
@Component
class RequestId implements Filter {

  static final String HEADER = "X-Request-Id";
  static final String ATTRIBUTE = "requestId";

  @Override
  public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
      throws IOException, ServletException {

    HttpServletRequest http = (HttpServletRequest) request;
    String incoming = http.getHeader(HEADER);
    // A client-supplied id is capped: it is echoed into logs and headers, and an
    // unbounded string is a way to make both unreadable.
    String id = incoming == null || incoming.isBlank() || incoming.length() > 64
        ? UUID.randomUUID().toString()
        : incoming;

    request.setAttribute(ATTRIBUTE, id);
    ((HttpServletResponse) response).setHeader(HEADER, id);

    long started = System.nanoTime();
    try {
      chain.doFilter(request, response);
    } finally {
      // One line per request. That is the whole observability story here, and
      // it is enough to answer "what was slow" and "what failed".
      long millis = (System.nanoTime() - started) / 1_000_000;
      System.out.printf(
          "[req] %s %s %d %dms id=%s%n",
          http.getMethod(),
          http.getRequestURI(),
          ((HttpServletResponse) response).getStatus(),
          millis,
          id);
    }
  }

  /** The current request's id, for an error body or an audit row. */
  static String of(HttpServletRequest request) {
    Object value = request.getAttribute(ATTRIBUTE);
    return value == null ? null : String.valueOf(value);
  }
}
