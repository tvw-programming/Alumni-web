import { createApiClient } from './axiosClient';

/**
 * Separate client for the Go Fiber service in `../../../api` (copied as-is
 * from react-gofiber-postgres-docker-best) — a different backend than the
 * dummyjson-backed `apiClient` in `axiosClient.ts`, so it gets its own
 * instance via the same factory rather than overloading one client with two
 * unrelated base URLs.
 *
 * Base URL defaults to the relative `/api` path, which resolves correctly in
 * every environment without any CORS setup on the Go side:
 *   - `pnpm dev`     -> proxied by Vite (see vite.config.ts) to the api
 *                       container's loopback-published port.
 *   - docker/nginx   -> proxied by nginx.conf's `location /api/` block to
 *                       the `api` service on the internal compose network.
 */
export const goApiClient = createApiClient({
  baseURL: import.meta.env.VITE_GO_API_BASE_URL ?? '/api',
  timeoutMs: 10_000,
});
