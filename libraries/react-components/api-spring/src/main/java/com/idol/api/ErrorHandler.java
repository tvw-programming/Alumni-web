package com.idol.api;

import jakarta.servlet.http.HttpServletRequest;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.NoHandlerFoundException;

/**
 * One error shape for every failure, matching the Go API's envelope so the same
 * frontend code can read either:
 *
 * <pre>{"error": {"code": "NOT_FOUND", "message": "…", "requestId": "…"}}</pre>
 */
@RestControllerAdvice
class ErrorHandler {

  @ExceptionHandler(ApiException.class)
  ResponseEntity<Map<String, Object>> handleApi(ApiException e, HttpServletRequest request) {
    return body(e.status, e.code, e.getMessage(), request);
  }

  /** Unparseable JSON is the caller's problem, not a 500. */
  @ExceptionHandler(HttpMessageNotReadableException.class)
  ResponseEntity<Map<String, Object>> handleBadJson(HttpServletRequest request) {
    return body(HttpStatus.BAD_REQUEST, "INVALID_BODY", "The request body could not be read.", request);
  }

  @ExceptionHandler(NoHandlerFoundException.class)
  ResponseEntity<Map<String, Object>> handleMissing(HttpServletRequest request) {
    return body(HttpStatus.NOT_FOUND, "NOT_FOUND", "Route not found.", request);
  }

  @ExceptionHandler(Exception.class)
  ResponseEntity<Map<String, Object>> handleUnknown(Exception e, HttpServletRequest request) {
    // The cause is logged, not returned: an exception message can carry a SQL
    // fragment or a file path, and neither belongs in a client response. The
    // request id is what connects the two.
    System.out.println("[error] id=" + RequestId.of(request) + " " + e);
    e.printStackTrace();
    return body(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL", "Something went wrong.", request);
  }

  private ResponseEntity<Map<String, Object>> body(
      HttpStatus status, String code, String message, HttpServletRequest request) {
    Map<String, Object> error = new LinkedHashMap<>();
    error.put("code", code);
    error.put("message", message);
    error.put("requestId", RequestId.of(request));
    return ResponseEntity.status(status).body(Map.of("error", error));
  }
}
