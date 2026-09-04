package com.idol.api;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

/**
 * A fixed-window, per-IP throttle for the credential endpoints.
 *
 * Ten attempts a minute, matching the Go API. This is the network-level
 * companion to the per-account lockout in {@link AuthController}: the lockout
 * stops one account being ground down, this stops one source spraying many
 * accounts. Neither alone is enough.
 *
 * In memory, so it resets on restart and is per-instance — a second replica
 * would double the real budget. The Go API has the same property; anything
 * better needs shared state, which is a bigger machine than this app is.
 */
@Component
class RateLimiter {

  private static final int MAX_PER_MINUTE = 10;

  private record Window(long minute, AtomicInteger count) {}

  private final Map<String, Window> windows = new ConcurrentHashMap<>();

  /** Counts one attempt from this address, or throws 429. */
  void check(String address) {
    long minute = Instant.now().getEpochSecond() / 60;

    Window window = windows.compute(address, (key, current) ->
        current == null || current.minute() != minute
            ? new Window(minute, new AtomicInteger(0))
            : current);

    if (window.count().incrementAndGet() > MAX_PER_MINUTE) {
      throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "RATE_LIMITED",
          "Too many attempts. Please wait a minute and try again.");
    }

    // Without this the map grows one entry per address, forever. Cheap because
    // it only runs when the map is already large.
    if (windows.size() > 10_000) {
      windows.entrySet().removeIf(entry -> entry.getValue().minute() < minute);
    }
  }
}
