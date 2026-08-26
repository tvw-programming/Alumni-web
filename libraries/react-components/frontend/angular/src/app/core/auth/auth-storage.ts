/**
 * The access token, held in memory.
 *
 * Deliberately *not* in `localStorage` or `sessionStorage`: anything script can
 * read, injected script can steal. The long-lived credential is the refresh
 * token, and that lives in an httpOnly cookie the browser attaches on its own —
 * script never sees it, so an XSS bug cannot exfiltrate a 30-day session.
 *
 * The cost is that a reload starts with no access token. `AuthService.restore()`
 * spends the refresh cookie to get a new one, and `AuthStore.isRestoring`
 * exists so guards do not redirect during that window.
 *
 * Module-level rather than a service because the HTTP interceptor reads it on
 * every request and must not depend on the injector being available — the same
 * constraint the React app documents for its Axios interceptor.
 */

let accessToken: string | null = null;
let expiresAt = 0;

export function getStoredAuthToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string, expiresInSeconds: number): void {
  accessToken = token;
  expiresAt = Date.now() + expiresInSeconds * 1000;
}

export function clearAccessToken(): void {
  accessToken = null;
  expiresAt = 0;
}

/** True when the token is gone or within 30 seconds of expiring. */
export function accessTokenIsStale(): boolean {
  return accessToken === null || Date.now() > expiresAt - 30_000;
}
