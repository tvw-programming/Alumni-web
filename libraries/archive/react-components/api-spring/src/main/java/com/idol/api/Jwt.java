package com.idol.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

/**
 * HS256 tokens, by hand.
 *
 * A JWT is three base64url segments joined by dots, the third being an HMAC of
 * the first two. That is the entire format, so a library buys nothing here.
 *
 * The one rule that matters: {@link #verify} recomputes the signature over the
 * received header and payload and never reads `alg` from the token. A verifier
 * that trusts the token's own `alg` accepts `{"alg":"none"}` — the classic JWT
 * break.
 */
final class Jwt {

  private static final ObjectMapper JSON = new ObjectMapper();
  private static final Base64.Encoder ENC = Base64.getUrlEncoder().withoutPadding();
  private static final Base64.Decoder DEC = Base64.getUrlDecoder();

  private final byte[] secret;

  Jwt(String secret) {
    this.secret = secret.getBytes(StandardCharsets.UTF_8);
  }

  String sign(long userId, String role, long expiresAtEpochSeconds) {
    try {
      Map<String, Object> claims = new LinkedHashMap<>();
      claims.put("sub", String.valueOf(userId));
      claims.put("role", role);
      claims.put("exp", expiresAtEpochSeconds);

      String header = ENC.encodeToString("{\"alg\":\"HS256\",\"typ\":\"JWT\"}".getBytes(StandardCharsets.UTF_8));
      String payload = ENC.encodeToString(JSON.writeValueAsBytes(claims));
      String signingInput = header + "." + payload;
      return signingInput + "." + ENC.encodeToString(hmac(signingInput));
    } catch (Exception e) {
      throw new IllegalStateException("could not sign token", e);
    }
  }

  /** Who the caller is, from a token that verified. */
  record Claims(long userId, String role) {}

  /** The claims in a valid, unexpired token, or null. */
  Claims verify(String token) {
    try {
      String[] parts = token.split("\\.");
      if (parts.length != 3) return null;

      byte[] expected = hmac(parts[0] + "." + parts[1]);
      byte[] actual = DEC.decode(parts[2]);
      // Constant-time: a byte-by-byte comparison that returns early leaks how
      // much of a forged signature was right.
      if (!java.security.MessageDigest.isEqual(expected, actual)) return null;

      Map<?, ?> claims = JSON.readValue(DEC.decode(parts[1]), Map.class);
      long exp = ((Number) claims.get("exp")).longValue();
      if (exp < System.currentTimeMillis() / 1000) return null;

      return new Claims(
          Long.parseLong(String.valueOf(claims.get("sub"))),
          String.valueOf(claims.get("role")));
    } catch (Exception e) {
      // A malformed token is an invalid token, not a server error.
      return null;
    }
  }

  private byte[] hmac(String input) throws Exception {
    Mac mac = Mac.getInstance("HmacSHA256");
    mac.init(new SecretKeySpec(secret, "HmacSHA256"));
    return mac.doFinal(input.getBytes(StandardCharsets.UTF_8));
  }
}
