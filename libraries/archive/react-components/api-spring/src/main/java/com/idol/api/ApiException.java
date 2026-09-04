package com.idol.api;

import org.springframework.http.HttpStatus;

/**
 * A failure with a status and a machine-readable code.
 *
 * The codes are the Go API's, verbatim, because the frontends switch on them —
 * `UNAUTHENTICATED` and `UNAUTHORIZED` are not interchangeable to code that
 * reads `error.code`.
 */
class ApiException extends RuntimeException {

  final HttpStatus status;
  final String code;

  ApiException(HttpStatus status, String code, String message) {
    super(message);
    this.status = status;
    this.code = code;
  }

  static ApiException badRequest(String code, String message) {
    return new ApiException(HttpStatus.BAD_REQUEST, code, message);
  }

  /** No credentials, or credentials that no longer verify. */
  static ApiException unauthenticated(String message) {
    return new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED", message);
  }

  /** Authenticated, but not allowed — a different failure from the above. */
  static ApiException forbidden(String message) {
    return new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", message);
  }

  static ApiException notFound(String message) {
    return new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", message);
  }

  static ApiException conflict(String code, String message) {
    return new ApiException(HttpStatus.CONFLICT, code, message);
  }
}
